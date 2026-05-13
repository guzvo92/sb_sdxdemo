// demoSdk — reemplazo del Sdkrout_back del prod. Adapta el shape de las
// respuestas del backend Flask real a fetches a JSONs estaticos en
// /demo-data/, descubriendo el folder de fecha mas reciente via
// /api/snap_index.
//
// Solo expone los 4 metodos que /hackathonview y /globalhackathon usan:
//   - fetch_category_list()
//   - fetch_snapshot_latest(token)
//   - fetch_globalrun_history()
//   - fetch_snapshot_holders_top100(token)

interface SnapIndex {
  snapshots:      { folders: string[]; latest: string | null };
  holders:        { folders: string[]; latest: string | null };
  dexscraptokens: { folders: string[]; latest: string | null };
}

// Cache con TTL corto: 5s para no spamear el endpoint en re-renders pero
// permitir que un REGEN reciente aparezca sin recargar la pagina entera.
let cachedIdx: SnapIndex | null = null;
let cachedIdxAt = 0;
const IDX_TTL_MS = 5000;
async function getIdx(): Promise<SnapIndex> {
  if (cachedIdx && Date.now() - cachedIdxAt < IDX_TTL_MS) return cachedIdx;
  const r = await fetch("/api/snap_index", { cache: "no-store" });
  const d = await r.json();
  cachedIdx = {
    snapshots:      d.snapshots      ?? { folders: [], latest: null },
    holders:        d.holders        ?? { folders: [], latest: null },
    dexscraptokens: d.dexscraptokens ?? { folders: [], latest: null },
  };
  cachedIdxAt = Date.now();
  return cachedIdx;
}

export class Sdkrout_back {
  // Devuelve la lista de categorias desde /demo-data/global/categories.json.
  async fetch_category_list(): Promise<{ ok: boolean; categories: Array<{ id: number; name: string; color: string; tokens: string[] }> }> {
    try {
      const r = await fetch("/demo-data/global/categories.json", { cache: "no-store" });
      const d = await r.json();
      return { ok: !!d.ok, categories: Array.isArray(d.categories) ? d.categories : [] };
    } catch {
      return { ok: false, categories: [] };
    }
  }

  // Lee el snapshot rico del folder mas reciente y lo enriquece combinando
  // con dexscraptokens.json (metadata DEX) + holders/<slug>.json (sum por
  // bucket). Devuelve el shape gordo que sec_datatext_hackathon espera:
  // an_nholders_*, an_perc_nholders_*, an_tokens_sum_*, dex_price, name,
  // dex_supply_raw, indx_supplyfound, amount_lost, perc_lost,
  // dex_main_pool_found, dex_full_info.pools_high.
  async fetch_snapshot_latest(token: string): Promise<{ ok: boolean; token: string; idsnap: number; data: any }> {
    try {
      const idx = await getIdx();
      const snapFolder = idx.snapshots.latest;
      const holdFolder = idx.holders.latest;
      const dexFolder  = idx.dexscraptokens.latest;
      if (!snapFolder) return { ok: false, token, idsnap: 0, data: null };

      const [snapRes, dexRes, holdRes] = await Promise.all([
        fetch(`/demo-data/snapshots/${snapFolder}/${token}.json`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null).catch(() => null),
        dexFolder
          ? fetch(`/demo-data/dexscraptokens/${dexFolder}/all.json`, { cache: "no-store" })
              .then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),
        holdFolder
          ? fetch(`/demo-data/holders/${holdFolder}/${token}.json`, { cache: "no-store" })
              .then(r => r.ok ? r.json() : []).catch(() => [])
          : Promise.resolve([]),
      ]);

      if (!snapRes) return { ok: false, token, idsnap: 0, data: null };

      const dexTok: any = Array.isArray(dexRes?.tokens)
        ? (dexRes.tokens.find((t: any) => t.slug === token) ?? {})
        : {};
      const holders: any[] = Array.isArray(holdRes) ? holdRes : [];

      const nholders_full = Number(snapRes.nholders_full || 0);
      const supplyApprox = (dexTok.fdv && dexTok.price_usd && Number(dexTok.price_usd) > 0)
        ? Number(dexTok.fdv) / Number(dexTok.price_usd)
        : 0;

      const total_holders_amount = holders.reduce((s, h) => s + Number(h.amount || 0), 0);

      // Brackets USD para derivar an_tokens_sum_*.
      const usdBrackets: Array<{ key: string; min: number; max: number | null }> = [
        { key: "over50000",    min: 50000, max: null  },
        { key: "10000to50000", min: 10000, max: 50000 },
        { key: "5000to10000",  min: 5000,  max: 10000 },
        { key: "1000to5000",   min: 1000,  max: 5000  },
        { key: "500to1000",    min: 500,   max: 1000  },
        { key: "100to500",     min: 100,   max: 500   },
        { key: "under100",     min: 0,     max: 100   },
      ];

      const enriched: any = { ...snapRes };
      enriched.name             = dexTok.name || token;
      enriched.dex_price        = dexTok.price_usd ?? 0;
      enriched.dex_supply_raw   = supplyApprox || total_holders_amount;
      enriched.indx_supplyfound = total_holders_amount;
      const lost = enriched.dex_supply_raw - total_holders_amount;
      enriched.amount_lost = lost;
      enriched.perc_lost   = enriched.dex_supply_raw > 0
        ? +((lost / enriched.dex_supply_raw) * 100).toFixed(2)
        : 0;

      enriched.an_nholders_full      = nholders_full;
      enriched.an_perc_nholders_full = nholders_full > 0
        ? +((total_holders_amount / (enriched.dex_supply_raw || 1)) * 100).toFixed(2)
        : 100;

      // Mapeo acc_<bucket> -> an_nholders_<bucket> + an_perc_nholders_<bucket>
      // + an_tokens_sum_<bucket> (sum de amounts de holders cuyos value_today
      // caen en el rango).
      for (const b of usdBrackets) {
        const n = Number(snapRes[`acc_${b.key}`] || 0);
        enriched[`an_nholders_${b.key}`]      = n;
        enriched[`an_perc_nholders_${b.key}`] = nholders_full > 0
          ? +((n / nholders_full) * 100).toFixed(2)
          : 0;
        let tokenSum = 0;
        for (const h of holders) {
          const usd = Number(h.value_today || 0);
          const inBucket = b.max === null ? usd > b.min : (usd > b.min && usd <= b.max);
          if (inBucket) tokenSum += Number(h.amount || 0);
        }
        enriched[`an_tokens_sum_${b.key}`] = tokenSum;
      }

      // over/under $100 totales — usados por la barra split de Tokens
      // Distribution. nholders_over100 + nholders_under100 vienen del snap.
      enriched.an_nholders_over100  = Number(snapRes.nholders_over100  || 0);
      enriched.an_nholders_under100 = Number(snapRes.nholders_under100 || 0);

      // Brackets por amount de tokens (tok_*) -> an_nholders_tokens_<bracket>
      // + an_perc_nholders_tokens_<bracket>. Estos los lee Tokens Distribution
      // para mostrar la grilla de bandas (+100M, 10M–100M, ..., 100–1k).
      const tokenBrackets = [
        "over100M", "10Mto100M", "5Mto10M", "1Mto5M",
        "100kto1M", "10kto100k", "1kto10k", "100to1k",
      ];
      for (const tb of tokenBrackets) {
        const n = Number(snapRes[`tok_${tb}`] || 0);
        enriched[`an_nholders_tokens_${tb}`]      = n;
        enriched[`an_perc_nholders_tokens_${tb}`] = nholders_full > 0
          ? +((n / nholders_full) * 100).toFixed(2)
          : 0;
      }

      // dex_main_pool_found + dex_full_info.pools_high desde raw_pairs.
      // Mapea cada pair de DexScreener al shape plano que la tabla
      // Top Pools (High) consume en sec_datatext_hackathon.
      const pairs: any[] = Array.isArray(dexTok.raw_pairs) ? dexTok.raw_pairs : [];
      const fmt = (n: any) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
      const fmtDate = (ms: any) => ms ? new Date(ms).toISOString().slice(0, 10) : "";
      const flattenPool = (p: any, idx: number) => {
        const liqUsdRaw   = Number(p?.liquidity?.usd   || 0);
        const liqBaseRaw  = Number(p?.liquidity?.base  || 0);
        const liqQuoteRaw = Number(p?.liquidity?.quote || 0);
        const priceBase   = Number(p?.priceUsd || 0);
        // Valor USD del lado base = cantidad de base tokens * precio USD.
        const calcBase  = liqBaseRaw > 0 && priceBase > 0 ? liqBaseRaw * priceBase : 0;
        // Valor USD del lado quote = diferencia entre liq total y base.
        const calcQuote = liqUsdRaw > 0 ? Math.max(0, liqUsdRaw - calcBase) : 0;
        return {
          idx:                 idx + 1,
          dexId:               p?.dexId ?? "",
          pool_address:        p?.pairAddress ?? "",
          liq_usd:             fmt(liqUsdRaw),
          liq_base:            fmt(liqBaseRaw),
          liq_quote:           fmt(liqQuoteRaw),
          calc_base_value:     fmt(calcBase),
          calc_quote_value:    fmt(calcQuote),
          quotetoken_symbol:   p?.quoteToken?.symbol ?? "",
          createdAt_formatted: fmtDate(p?.pairCreatedAt),
          _liq_usd_raw:        liqUsdRaw,
        };
      };

      if (pairs.length > 0) {
        // Mayor liquidez primero (DexScreener ya los entrega ordenados,
        // pero re-ordenamos por las dudas).
        const sorted = [...pairs].sort(
          (a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0),
        );
        const mainFlat = flattenPool(sorted[0], 0);
        enriched.dex_main_pool_found = mainFlat;
        // Pools con liquidez >$5,000 USD (umbral que muestra el header).
        const high = sorted
          .map((p, i) => flattenPool(p, i))
          .filter(p => p._liq_usd_raw > 5000)
          .slice(0, 20);
        enriched.dex_full_info = { pools_high: high };
      } else {
        enriched.dex_main_pool_found = null;
        enriched.dex_full_info = { pools_high: [] };
      }

      return { ok: true, token, idsnap: parseInt(String(snapRes?.runts ?? "0")), data: enriched };
    } catch {
      return { ok: false, token, idsnap: 0, data: null };
    }
  }

  // Construye el agregado multi-token leyendo TODOS los folders de
  // snapshot del index (un timestamp por folder, un slug por archivo).
  // El shape de salida es el que /globalhackathon (buildTimestamp) espera:
  // tokens[].timestamps[] con perc_* (liquidity) y nholders_* (acc buckets
  // remapeados) + perc_nholders_* calculados sobre nholders_full.
  async fetch_globalrun_history(): Promise<{ ok: boolean; tokens: any[] }> {
    try {
      const [idx, targetsRes] = await Promise.all([
        getIdx(),
        fetch("/targets.json", { cache: "no-store" })
          .then(r => r.ok ? r.json() : { targets: [] })
          .catch(() => ({ targets: [] })),
      ]);
      const folders = idx.snapshots.folders;
      const targets: { slug: string; ca: string }[] = (targetsRes?.targets || [])
        .filter((t: any) => t?.slug && t?.ca && String(t.ca).length >= 32 && !String(t.ca).startsWith("PASTE_"));
      if (folders.length === 0 || targets.length === 0) {
        return { ok: false, tokens: [] };
      }

      // Calcula % seguro (n / total * 100) con 2 decimales.
      const pct = (n: number, total: number): number =>
        total > 0 ? +((n / total) * 100).toFixed(2) : 0;

      // Mapea un snapshot rich (acc_*, liq_*, nholders_*) al row plano que
      // buildTimestamp consume.
      const toRow = (s: any): any => {
        const nholdersFull = Number(s?.nholders_full || 0);
        const over50000    = Number(s?.acc_over50000    || 0);
        const r10kto50k    = Number(s?.acc_10000to50000 || 0);
        const r5kto10k     = Number(s?.acc_5000to10000  || 0);
        const r1kto5k      = Number(s?.acc_1000to5000   || 0);
        const r500to1k     = Number(s?.acc_500to1000    || 0);
        const r100to500    = Number(s?.acc_100to500     || 0);
        const under100     = Number(s?.nholders_under100 || s?.acc_under100 || 0);
        return {
          runts:             Number(s?.runts || 0),
          // Liquidity (1:1 con liq_*)
          perc_bigpool:      Number(s?.liq_bigpool   || 0),
          perc_top1_10:      Number(s?.liq_top1_10   || 0),
          perc_top11_20:     Number(s?.liq_top11_20  || 0),
          perc_top21_50:     Number(s?.liq_top21_50  || 0),
          perc_top51_100:    Number(s?.liq_top51_100 || 0),
          perc_others:       Number(s?.liq_others    || 0),
          // Counts (acc_* remapeados a nholders_*)
          nholders_full:          nholdersFull,
          nholders_over100:       Number(s?.nholders_over100 || 0),
          nholders_under100:      under100,
          nholders_over50000:     over50000,
          nholders_10000to50000:  r10kto50k,
          nholders_5000to10000:   r5kto10k,
          nholders_1000to5000:    r1kto5k,
          nholders_500to1000:     r500to1k,
          nholders_100to500:      r100to500,
          // % calculados sobre nholders_full
          perc_nholders_over50000:    pct(over50000,  nholdersFull),
          perc_nholders_10000to50000: pct(r10kto50k,  nholdersFull),
          perc_nholders_5000to10000:  pct(r5kto10k,   nholdersFull),
          perc_nholders_1000to5000:   pct(r1kto5k,    nholdersFull),
          perc_nholders_500to1000:    pct(r500to1k,   nholdersFull),
          perc_nholders_100to500:     pct(r100to500,  nholdersFull),
          perc_nholders_under100:     pct(under100,   nholdersFull),
        };
      };

      // Por cada folder cronologico, por cada slug, fetch del snapshot.
      // Agrupa por slug -> arr de rows ordenados por runts.
      const grouped: Record<string, any[]> = {};
      for (const slug of targets.map(t => t.slug)) grouped[slug] = [];

      const jobs: Array<Promise<{ slug: string; row: any | null }>> = [];
      for (const folder of folders) {
        for (const t of targets) {
          jobs.push(
            fetch(`/demo-data/snapshots/${folder}/${t.slug}.json`, { cache: "no-store" })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
              .then(snap => ({ slug: t.slug, row: snap ? toRow(snap) : null })),
          );
        }
      }
      const results = await Promise.all(jobs);
      for (const r of results) {
        if (r.row) grouped[r.slug].push(r.row);
      }
      // Ordena cada serie por runts asc.
      for (const slug of Object.keys(grouped)) {
        grouped[slug].sort((a, b) => a.runts - b.runts);
      }

      const tokens = targets
        .map(t => ({ token_name: t.slug, timestamps: grouped[t.slug] }))
        .filter(t => t.timestamps.length > 0);

      return { ok: true, tokens };
    } catch {
      return { ok: false, tokens: [] };
    }
  }

  // Top 100 holders del slug pedido. Lee del folder mas reciente segun el
  // index. Devuelve shape compatible con sec_holdertable_hackathon del prod.
  async fetch_snapshot_holders_top100(token: string): Promise<{ ok: boolean; token: string; idsnap: number; data: any[] }> {
    try {
      const idx = await getIdx();
      const folder = idx.holders.latest;
      if (!folder) return { ok: false, token, idsnap: 0, data: [] };
      const r = await fetch(`/demo-data/holders/${folder}/${token}.json`, { cache: "no-store" });
      if (!r.ok) return { ok: false, token, idsnap: 0, data: [] };
      const rawArr = await r.json();
      const data = Array.isArray(rawArr) ? rawArr.slice(0, 100) : [];
      return { ok: true, token, idsnap: 0, data };
    } catch {
      return { ok: false, token, idsnap: 0, data: [] };
    }
  }
}
