// makesnap.ts — script standalone que orquesta TODO el snapshot del demo.
//
//   F1: DexScreener -> public/demo-data/dexscraptokens.json
//   F2: Helius DAS  -> public/demo-data/holders/<slug>.json
//                   + public/demo-data/snapshots/<slug>.json
//
// Trigger: child_process.spawn("npx", ["tsx", "makesnap.ts"]) desde
// /api/regenerate (fire-and-forget), o ejecucion manual.
// Requiere env HELIUS_API_KEY (sin la key falla con missing_helius_key).
// tsx maneja .ts ESM out-of-the-box (vs ts-node que en Node 20 falla con
// ERR_UNKNOWN_FILE_EXTENSION al intentar cargar archivos con imports ESM).
//
// Progreso: escribe public/demo-data/snap_progress.json en cada paso
// significativo. El frontend (boton REGEN del navbar) polea ese archivo
// via GET /api/snap_progress y muestra vista progresiva.
//
// Uso:
//   npx tsx makesnap.ts
//   npx tsx makesnap.ts --dry-run
//   npx tsx makesnap.ts --targets public/targets.json --out public/demo-data
//   docker exec satelldexdemo npx tsx makesnap.ts

// General skill : v2.5 (04-abr-26)

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  fetchTokenAsset,
  fetchTokenHolders,
  enrichHolders,
  buildSnapshotRich,
} from "./app/lib/helius";
import { fetchDexScreenerToken } from "./app/lib/scraper";

// Carga .env.local manualmente (sin dotenv) cuando makesnap se invoca via
// `docker exec ... npx tsx makesnap.ts`. Ese proceso es nuevo y NO hereda
// las env vars que Next inyecta al arrancar (solo el spawn desde Next sí).
// Parser minimo: ignora comments y vacios, strip de comillas alrededor del
// valor, no sobrescribe si la var ya esta en process.env (la del Next spawn
// sigue teniendo prioridad).
async function loadEnvLocal(cwd: string): Promise<void> {
  try {
    const raw = await readFile(path.join(cwd, ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // silencioso — si no existe .env.local, sigue con process.env actual
  }
}

interface CliArgs {
  targetsPath:  string;
  outDir:       string;
  progressPath: string;
  dryRun:       boolean;
  topN:         number;
}

interface TokenResult {
  slug:          string;
  ca:            string;
  holders_count: number;
  holders_top:   number;
  symbol:        string;
  supply:        number;
  price:         number;
  decimals:      number;
  elapsed_ms:    number;
  ok:            boolean;
  error?:        string;
}

interface ProgressState {
  status:        "starting" | "running" | "done" | "error";
  started_at:    string;
  started_at_ts: number;
  last_update:   string;
  phase:         "init" | "dexscreener" | "helius" | "writing" | "complete";
  current_idx:   number;
  current_total: number;
  current_token: string | null;
  current_step:  string;
  completed:     Array<{ slug: string; ok: boolean; elapsed_ms: number; holders_count?: number; symbol?: string; error?: string }>;
  elapsed_ms:    number;
  result?:       any;
  error?:        string;
}

const T0 = Date.now();
const START_ISO = new Date().toISOString();

function logStep(msg: string): void {
  const s = ((Date.now() - T0) / 1000).toFixed(2);
  console.log(`[t+${s.padStart(6)}s] ${msg}`);
}

// Carpeta de fecha YYYY_MM_DD basada en la hora local del server.
// Usada para archivar snapshots/holders/dexscraptokens historicos.
function dateFolder(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}_${m}_${dd}`;
}

function parseArgs(argv: string[]): CliArgs {
  const cwd = process.cwd();
  const args: CliArgs = {
    targetsPath:  path.join(cwd, "public", "targets.json"),
    outDir:       path.join(cwd, "public", "demo-data"),
    progressPath: path.join(cwd, "public", "demo-data", "snap_progress.json"),
    dryRun:       false,
    topN:         100,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--targets")  args.targetsPath  = argv[++i];
    else if (a === "--out")      args.outDir       = argv[++i];
    else if (a === "--top")      args.topN         = parseInt(argv[++i]);
    else if (a === "--progress") args.progressPath = argv[++i];
  }
  return args;
}

// Estado mutable. Cada writeProgress() persiste a disco para que el front
// pueda leer en cualquier momento.
const progress: ProgressState = {
  status:        "starting",
  started_at:    START_ISO,
  started_at_ts: Math.floor(T0 / 1000),
  last_update:   START_ISO,
  phase:         "init",
  current_idx:   0,
  current_total: 0,
  current_token: null,
  current_step:  "booting",
  completed:     [],
  elapsed_ms:    0,
};

let PROGRESS_PATH = "";

async function writeProgress(): Promise<void> {
  progress.last_update = new Date().toISOString();
  progress.elapsed_ms = Date.now() - T0;
  try {
    await mkdir(path.dirname(PROGRESS_PATH), { recursive: true });
    await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
  } catch (e) {
    // no abortamos si el write falla — el log de consola sigue activo
  }
}

// Procesa un solo target con DexScreener (F1) y Helius (F2).
async function processToken(
  apiKey: string,
  slug:   string,
  ca:     string,
  outDir: string,
  topN:   number,
  dryRun: boolean,
  idx:    number,
  total:  number,
): Promise<{ result: TokenResult; dex: any | null }> {
  const tStart = Date.now();
  const res: TokenResult = {
    slug,
    ca,
    holders_count: 0,
    holders_top:   0,
    symbol:        "",
    supply:        0,
    price:         0,
    decimals:      0,
    elapsed_ms:    0,
    ok:            false,
  };
  let dex: any = null;

  progress.current_idx = idx;
  progress.current_total = total;
  progress.current_token = slug;

  try {
    // F1 DexScreener
    progress.phase = "dexscreener";
    progress.current_step = `[F1] dexscreener · ${slug}`;
    await writeProgress();
    logStep(`  [${slug}] dexscreener…`);
    try {
      dex = await fetchDexScreenerToken(ca);
      logStep(`  [${slug}] dex ok · price=$${dex.price_usd ?? "?"} fdv=${dex.fdv ?? "?"} pools=${dex.npools}`);
    } catch (e: any) {
      logStep(`  [${slug}] dex FAIL · ${e?.message ?? ""}`);
    }

    // F2 Helius getAsset
    progress.phase = "helius";
    progress.current_step = `[F2] helius getAsset · ${slug}`;
    await writeProgress();
    logStep(`  [${slug}] helius getAsset…`);
    const asset = await fetchTokenAsset(apiKey, ca);
    res.symbol   = asset.symbol;
    res.supply   = asset.supply;
    res.price    = asset.price;
    res.decimals = asset.decimals;
    logStep(`  [${slug}] asset ok · ${asset.symbol} decimals=${asset.decimals} supply=${asset.supply}`);

    // F2 Helius getTokenAccounts paginado (loguea progreso por pagina)
    progress.current_step = `[F2] helius getTokenAccounts · ${slug}`;
    await writeProgress();
    logStep(`  [${slug}] helius getTokenAccounts paginated…`);
    const raw = await fetchTokenHolders(apiKey, ca, asset.decimals, async (page, acc) => {
      progress.current_step = `[F2] ${slug} · page ${page} · ${acc} accts`;
      await writeProgress();
      logStep(`  [${slug}]   page ${page} · ${acc} accounts acumuladas`);
    });
    res.holders_count = raw.length;
    logStep(`  [${slug}] holders unicos: ${raw.length}`);

    // Enrich + bucketize
    const top = raw.slice(0, topN);
    const enriched = enrichHolders(top, asset.supply, asset.price);
    res.holders_top = enriched.length;
    const allEnriched = enrichHolders(raw, asset.supply, asset.price);
    const snap = buildSnapshotRich(allEnriched, asset);

    // Write — layout limpio: solo <YYYY_MM_DD>/<slug>.json (sin sufijo
    // de runts ni LATEST suelto). Cada run del mismo dia sobreescribe el
    // archivo del slug. Para auto-detectar el folder mas reciente desde
    // el front, usar GET /api/snap_index.
    if (dryRun) {
      logStep(`  [${slug}] dry-run · skip write`);
    } else {
      progress.phase = "writing";
      progress.current_step = `[F2] writing ${slug}`;
      await writeProgress();
      const folder = dateFolder();

      const holdersPath = path.join(outDir, "holders", folder, `${slug}.json`);
      const snapPath    = path.join(outDir, "snapshots", folder, `${slug}.json`);

      await mkdir(path.dirname(holdersPath), { recursive: true });
      await mkdir(path.dirname(snapPath), { recursive: true });

      await writeFile(holdersPath, JSON.stringify(enriched, null, 2));
      await writeFile(snapPath, JSON.stringify(snap, null, 2));

      logStep(`  [${slug}] wrote ${folder}/${slug}.json (holders + snapshot)`);
    }

    res.ok = true;
  } catch (e: any) {
    res.error = e?.message ?? "unknown_error";
    logStep(`  [${slug}] FAIL · ${res.error}`);
  } finally {
    res.elapsed_ms = Date.now() - tStart;
  }

  return { result: res, dex };
}

async function makesnap(args: CliArgs): Promise<any> {
  PROGRESS_PATH = args.progressPath;

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    progress.status = "error";
    progress.error = "missing_helius_key";
    await writeProgress();
    throw new Error("missing_helius_key (set HELIUS_API_KEY env var)");
  }

  progress.status = "running";
  progress.current_step = "reading targets.json";
  await writeProgress();
  logStep(`makesnap start · targets=${args.targetsPath} · out=${args.outDir} · topN=${args.topN} · dry_run=${args.dryRun}`);

  const raw = await readFile(args.targetsPath, "utf-8");
  const targets = JSON.parse(raw);
  const list: any[] = Array.isArray(targets.targets) ? targets.targets : [];

  const work: Array<{ slug: string; ca: string }> = [];
  for (const t of list) {
    const ca = String(t.ca ?? "");
    if (ca.startsWith("PASTE_") || ca.length < 32) continue;
    work.push({ slug: String(t.slug ?? ""), ca });
  }
  progress.current_total = work.length;
  await writeProgress();
  logStep(`tokens validos: ${work.length} / ${list.length}`);
  if (work.length === 0) {
    progress.status = "error";
    progress.error = "no_valid_targets";
    await writeProgress();
    throw new Error("no_valid_targets");
  }

  const results: TokenResult[] = [];
  const dexTokens: any[] = [];

  for (let i = 0; i < work.length; i++) {
    const w = work[i];
    logStep(`[${i + 1}/${work.length}] ${w.slug} (${w.ca.slice(0, 6)}…${w.ca.slice(-6)})`);
    const { result, dex } = await processToken(apiKey, w.slug, w.ca, args.outDir, args.topN, args.dryRun, i + 1, work.length);
    results.push(result);
    if (dex) {
      (dex as any).slug = w.slug;
      dexTokens.push(dex);
    }
    progress.completed.push({
      slug:          result.slug,
      ok:            result.ok,
      elapsed_ms:    result.elapsed_ms,
      holders_count: result.holders_count,
      symbol:        result.symbol,
      error:         result.error,
    });
    await writeProgress();
  }

  // Escribe el dexscraptokens consolidado: un solo archivo por dia,
  // sin LATEST suelto, sin sufijo de runts. Cada run del mismo dia
  // sobreescribe.
  if (!args.dryRun && dexTokens.length > 0) {
    progress.phase = "writing";
    progress.current_step = "writing dexscraptokens";
    progress.current_token = null;
    await writeProgress();
    const folder = dateFolder();
    const dexPayload: any = {
      ok: true,
      scraped_at:    new Date().toISOString(),
      scraped_at_ts: Math.floor(Date.now() / 1000),
      source:        "dexscreener",
      count:         dexTokens.length,
      tokens:        dexTokens,
    };
    const dexPath = path.join(args.outDir, "dexscraptokens", folder, "all.json");
    await mkdir(path.dirname(dexPath), { recursive: true });
    await writeFile(dexPath, JSON.stringify(dexPayload, null, 2));
    logStep(`wrote dexscraptokens/${folder}/all.json (${dexTokens.length} tokens)`);
  }

  const ok = results.filter(r => r.ok).length;
  const fail = results.length - ok;
  const totalMs = Date.now() - T0;
  logStep(`makesnap done · ${ok}/${results.length} ok · ${fail} fail · ${totalMs}ms`);

  progress.status = "done";
  progress.phase = "complete";
  progress.current_step = `${ok}/${results.length} ok · ${fail} fail`;
  progress.current_token = null;
  progress.result = {
    summary:     { processed: results.length, ok, fail },
    elapsed_ms:  totalMs,
  };
  await writeProgress();

  return {
    ok:         true,
    elapsed_ms: totalMs,
    tokens:     results,
    summary:    { processed: results.length, ok, fail },
  };
}

(async () => {
  try {
    await loadEnvLocal(process.cwd());
    const args = parseArgs(process.argv.slice(2));
    const out = await makesnap(args);
    console.log("MAKESNAP_RESULT " + JSON.stringify(out));
    process.exit(0);
  } catch (e: any) {
    progress.status = "error";
    progress.error = e?.message ?? "unknown_error";
    try { await writeProgress(); } catch {}
    const err = { ok: false, error: e?.message ?? "unknown_error", elapsed_ms: Date.now() - T0 };
    console.error("MAKESNAP_ERROR " + JSON.stringify(err));
    process.exit(1);
  }
})();
