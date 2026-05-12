// Endpoint REGEN — trigger del pipeline de snapshot del demo.
//
// FLUJO FIRE-AND-FORGET:
//   1) POST valida firma + admin + targets.
//   2) Lanza makesnap.ts via `npx tsx makesnap.ts` (sin esperar close).
//   3) Devuelve inmediato { ok, started_at, targets_count, job }.
//   4) makesnap escribe snap_progress.json continuamente.
//   5) El front polea GET /api/snap_progress para vista progresiva.
//
// Auth: requiere firma ed25519 de admin (pubkey en public/admins.json).
// Mensaje canonico:  "satelldex-demo:regenerate:<unix_ts>"
// Body:              { pubkey, message, signature_b64 }

import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { verifyEd25519, isAdmin, parseTimestampedMsg } from "@/app/lib/verifySign";

const TARGETS_PATH      = path.join(process.cwd(), "public", "targets.json");
const PROGRESS_PATH     = path.join(process.cwd(), "public", "demo-data", "snap_progress.json");
const DEX_OUT_PATH      = path.join(process.cwd(), "public", "demo-data", "dexscraptokens.json");
const MAKESNAP          = "makesnap.ts";
const REPLAY_WINDOW_S   = 300;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!body?.pubkey || !body?.message || !body?.signature_b64) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const parsed = parseTimestampedMsg(body.message, "satelldex-demo:regenerate");
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "bad_message_format" }, { status: 400 });
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.ts) > REPLAY_WINDOW_S) {
    return NextResponse.json({ ok: false, error: "replay" }, { status: 401 });
  }
  if (!verifyEd25519(body.pubkey, body.message, body.signature_b64)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }
  if (!(await isAdmin(body.pubkey))) {
    return NextResponse.json({ ok: false, error: "not_admin" }, { status: 401 });
  }

  // Conteo de targets validos sin disparar nada — sirve para reportar al
  // front cuantos va a procesar antes de empezar.
  let targets: any;
  try {
    const raw = await readFile(TARGETS_PATH, "utf-8");
    targets = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "targets_unreadable" }, { status: 500 });
  }
  const targetsList: any[] = Array.isArray(targets.targets) ? targets.targets : [];
  const validCount = targetsList.filter((t: any) => {
    const ca = String(t.ca ?? "");
    return !ca.startsWith("PASTE_") && ca.length >= 32;
  }).length;
  if (validCount === 0) {
    return NextResponse.json({
      ok: false,
      error: "no_valid_targets",
      hint: "Editar public/targets.json: reemplazar PASTE_* por CAs reales."
    }, { status: 400 });
  }

  // Inicializa snap_progress.json con status=starting para que el front
  // tenga algo que polear desde el primer momento.
  const initial = {
    status:        "starting",
    started_at:    new Date().toISOString(),
    started_at_ts: now,
    last_update:   new Date().toISOString(),
    phase:         "init",
    current_idx:   0,
    current_total: validCount,
    current_token: null,
    current_step:  "spawning makesnap.ts",
    completed:     [],
    elapsed_ms:    0,
    triggered_by:  body.pubkey,
  };
  try {
    await mkdir(path.dirname(PROGRESS_PATH), { recursive: true });
    await writeFile(PROGRESS_PATH, JSON.stringify(initial, null, 2));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `progress_init_failed: ${e?.message ?? ""}` }, { status: 500 });
  }

  // Spawn fire-and-forget. unref() permite que el proceso parent (Next)
  // siga vivo independiente del child. stdio: ignore para que el child no
  // mantenga handles abiertos esperando lectura del parent.
  try {
    const child = spawn("npx", ["tsx", MAKESNAP], {
      cwd:    process.cwd(),
      env:    process.env,
      stdio:  ["ignore", "ignore", "ignore"],
      detached: true,
    });
    child.unref();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `spawn_failed: ${e?.message ?? ""}` }, { status: 500 });
  }

  return NextResponse.json({
    ok:             true,
    started_at:     initial.started_at,
    targets_count:  validCount,
    progress_url:   "/api/snap_progress",
    poll_interval:  1000,
  });
}

// GET — devuelve la ultima version del dexscraptokens.json para retrocompat.
export async function GET() {
  try {
    const raw = await readFile(DEX_OUT_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: true, tokens: [], count: 0, scraped_at: null });
  }
}
