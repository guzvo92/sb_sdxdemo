// Scraper DexScreener — lee public/targets.json (lista de CAs) y por cada
// uno consulta https://api.dexscreener.com/latest/dex/tokens/<ca>.
// Salida: public/demo-data/dexscraptokens.json con metadata enriquecida
// (symbol, name, price USD, fdv, marketcap, liquidity, volume, npools).
//
// DexScreener es publico, sin API key. NO devuelve holders ni supply
// detallado: si en el futuro se quiere shape rico para hackathonview,
// hay que sumar Helius DAS aparte (otro round).

const DEXS_BASE = "https://api.dexscreener.com/latest/dex/tokens";

export interface DexScrapToken {
  ca:             string;
  symbol:         string;
  name:           string;
  price_usd:      number | null;
  fdv:            number | null;
  marketcap:      number | null;
  liquidity_usd:  number | null;
  volume_24h:     number | null;
  npools:         number;
  // metadata adicional del primer pair (mas liquidez):
  chain_id:       string | null;
  dex_id:         string | null;
  pair_address:   string | null;
  price_change_24h: number | null;
  scraped_at:     string; // ISO
  raw_pairs:      any[];  // pairs originales para auditoria/futuro
}

// Llama a DexScreener para un solo CA. Devuelve el token enriquecido o
// un token con scraped_at + ca pero campos en null si no hay pairs.
export async function fetchDexScreenerToken(ca: string): Promise<DexScrapToken> {
  const url = `${DEXS_BASE}/${ca}`;
  const out: DexScrapToken = {
    ca,
    symbol:           "",
    name:             "",
    price_usd:        null,
    fdv:              null,
    marketcap:        null,
    liquidity_usd:    null,
    volume_24h:       null,
    npools:           0,
    chain_id:         null,
    dex_id:           null,
    pair_address:     null,
    price_change_24h: null,
    scraped_at:       new Date().toISOString(),
    raw_pairs:        [],
  };

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`dexscreener_http_${res.status}`);
  }
  const data = await res.json();
  const pairs: any[] = Array.isArray(data?.pairs) ? data.pairs : [];

  out.npools    = pairs.length;
  out.raw_pairs = pairs;

  if (pairs.length === 0) return out;

  // primer pair = mayor liquidez (DexScreener los devuelve ordenados desc).
  const main = pairs[0];
  out.symbol           = main?.baseToken?.symbol ?? "";
  out.name             = main?.baseToken?.name   ?? "";
  out.price_usd        = numOrNull(main?.priceUsd);
  out.fdv              = numOrNull(main?.fdv);
  out.marketcap        = numOrNull(main?.marketCap);
  out.liquidity_usd    = numOrNull(main?.liquidity?.usd);
  out.volume_24h       = numOrNull(main?.volume?.h24);
  out.chain_id         = main?.chainId ?? null;
  out.dex_id           = main?.dexId ?? null;
  out.pair_address     = main?.pairAddress ?? null;
  out.price_change_24h = numOrNull(main?.priceChange?.h24);

  return out;
}

// Procesa todos los targets en paralelo limitando concurrencia a 5.
export async function fetchAllTargets(cas: string[]): Promise<DexScrapToken[]> {
  const out: DexScrapToken[] = [];
  const CONCURRENCY = 5;
  for (let i = 0; i < cas.length; i += CONCURRENCY) {
    const batch = cas.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(ca => fetchDexScreenerToken(ca)));
    for (let j = 0; j < settled.length; j++) {
      const r = settled[j];
      if (r.status === "fulfilled") {
        out.push(r.value);
      } else {
        // si DexScreener falla para un CA puntual, deja un token con el ca
        // y campos en null para no romper el output entero.
        const stub: DexScrapToken = {
          ca:               batch[j],
          symbol:           "",
          name:             "",
          price_usd:        null,
          fdv:              null,
          marketcap:        null,
          liquidity_usd:    null,
          volume_24h:       null,
          npools:           0,
          chain_id:         null,
          dex_id:           null,
          pair_address:     null,
          price_change_24h: null,
          scraped_at:       new Date().toISOString(),
          raw_pairs:        [],
        };
        out.push(stub);
      }
    }
  }
  return out;
}

function numOrNull(v: any): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
