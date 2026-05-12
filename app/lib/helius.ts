// Helius DAS client — getAsset (metadata) + getTokenAccounts (holders).
// Usado por makesnap.ts para extraer top 100 holders de cada CA en targets.json.
//
// Requiere env HELIUS_API_KEY. Sin la key, lanza throw temprano para que el
// llamador devuelva 500/missing_helius_key al frontend.
//
// JSON-RPC base: https://mainnet.helius-rpc.com/?api-key=<KEY>

const HELIUS_BASE = "https://mainnet.helius-rpc.com";

export interface TokenAsset {
  mint:     string;
  name:     string;
  symbol:   string;
  decimals: number;
  supply:   number; // dividido por 10^decimals
  price:    number; // USD por token
}

export interface RawHolder {
  owner:  string;
  amount: number; // ya dividido por 10^decimals
}

export interface EnrichedHolder {
  owner:                       string;
  amount:                      number;
  percentage_of_total_supply:  number;
  value_today:                 number;
  has_mainpool:                boolean;
  lookas_mainpool:             boolean;
}

// Tolera dos formatos en HELIUS_API_KEY: la API key cruda (UUID) o la URL
// completa con ?api-key=UUID dentro. Si viene como URL, extrae el UUID.
function extractKey(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const match = trimmed.match(/[?&]api-key=([^&\s]+)/);
  return match ? match[1] : trimmed;
}

// JSON-RPC POST a Helius DAS. Lanza ante http != 2xx o si rpc.error existe.
async function heliusRpc(apiKey: string, method: string, params: any): Promise<any> {
  const key = extractKey(apiKey);
  const url = `${HELIUS_BASE}/?api-key=${key}`;
  const body: any = {};
  body.jsonrpc = "2.0";
  body.id      = "satelldex-demo";
  body.method  = method;
  body.params  = params;
  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`helius_http_${res.status}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`helius_${data.error.code ?? "rpc"}: ${data.error.message ?? ""}`);
  }
  return data.result;
}

// Lee metadata del mint: name, symbol, decimals, supply, price (USD).
export async function fetchTokenAsset(apiKey: string, mint: string): Promise<TokenAsset> {
  const result = await heliusRpc(apiKey, "getAsset", { id: mint });
  const decimals = Number(result?.token_info?.decimals ?? 0);
  const supplyRaw = Number(result?.token_info?.supply ?? 0);
  const supply = decimals > 0 ? supplyRaw / Math.pow(10, decimals) : supplyRaw;
  const price = Number(result?.token_info?.price_info?.price_per_token ?? 0);
  const out: TokenAsset = {
    mint,
    name:     String(result?.content?.metadata?.name ?? ""),
    symbol:   String(result?.content?.metadata?.symbol ?? ""),
    decimals,
    supply,
    price,
  };
  return out;
}

const MAX_PAGES = 20;
const PAGE_LIMIT = 1000;

// Pagina sobre getTokenAccounts hasta MAX_PAGES o hasta que la pagina
// devuelve menos de PAGE_LIMIT (significa que es la ultima). Agrupa por
// owner sumando amounts (un owner puede tener varias token accounts).
// onProgress se llama tras cada pagina con (pageIndex, accountsAcum).
export async function fetchTokenHolders(
  apiKey: string,
  mint: string,
  decimals: number,
  onProgress?: (page: number, accumulated: number) => void,
): Promise<RawHolder[]> {
  const byOwner = new Map<string, number>();
  let page = 1;
  let totalAccts = 0;
  while (page <= MAX_PAGES) {
    const params: any = {};
    params.mint  = mint;
    params.limit = PAGE_LIMIT;
    params.page  = page;
    const result = await heliusRpc(apiKey, "getTokenAccounts", params);
    const accounts: any[] = Array.isArray(result?.token_accounts) ? result.token_accounts : [];
    if (accounts.length === 0) break;
    for (const acc of accounts) {
      const owner = String(acc.owner ?? "");
      const raw = Number(acc.amount ?? 0);
      if (!owner || raw <= 0) continue;
      const human = decimals > 0 ? raw / Math.pow(10, decimals) : raw;
      byOwner.set(owner, (byOwner.get(owner) ?? 0) + human);
    }
    totalAccts += accounts.length;
    if (onProgress) onProgress(page, totalAccts);
    if (accounts.length < PAGE_LIMIT) break;
    page += 1;
  }
  const out: RawHolder[] = [];
  for (const [owner, amount] of byOwner) {
    out.push({ owner, amount });
  }
  out.sort((a, b) => b.amount - a.amount);
  return out;
}

// Convierte holders crudos en filas enriquecidas con shape rico (compat
// con sec_datatext_hackathon / sec_holdertable del prod).
export function enrichHolders(raw: RawHolder[], supply: number, price: number): EnrichedHolder[] {
  const safeSupply = supply > 0 ? supply : 1;
  const out: EnrichedHolder[] = [];
  for (const h of raw) {
    const row: EnrichedHolder = {
      owner:                      h.owner,
      amount:                     h.amount,
      percentage_of_total_supply: (h.amount / safeSupply) * 100,
      value_today:                h.amount * price,
      has_mainpool:               false,
      lookas_mainpool:            false,
    };
    out.push(row);
  }
  return out;
}

// Bucketize wallets en snapshot flat: an_perc_top10/20/50/100 + liq_* +
// acc_* (buckets USD) + tok_* (buckets token amount).
export function buildSnapshotRich(holders: EnrichedHolder[], asset: TokenAsset): any {
  const total = holders.length;
  const supply = asset.supply > 0 ? asset.supply : 1;
  const an_perc_bigpool = 0; // simplificado: sin identificar wallet de pool

  const sumTop = (n: number) => {
    let s = 0;
    for (let i = 0; i < Math.min(n, holders.length); i++) s += holders[i].amount;
    return (s / supply) * 100;
  };
  const an_perc_top10  = round2(sumTop(10));
  const an_perc_top20  = round2(sumTop(20));
  const an_perc_top50  = round2(sumTop(50));
  const an_perc_top100 = round2(sumTop(100));

  const top1_10   = an_perc_top10;
  const top11_20  = round2(an_perc_top20 - an_perc_top10);
  const top21_50  = round2(an_perc_top50 - an_perc_top20);
  const top51_100 = round2(an_perc_top100 - an_perc_top50);
  const others    = round2(100 - an_perc_bigpool - an_perc_top100);

  let acc_over50000 = 0, acc_10000to50000 = 0, acc_5000to10000 = 0;
  let acc_1000to5000 = 0, acc_500to1000 = 0, acc_100to500 = 0, acc_under100 = 0;
  let acc_over100 = 0;
  let tok_over100M = 0, tok_10Mto100M = 0, tok_5Mto10M = 0, tok_1Mto5M = 0;
  let tok_100kto1M = 0, tok_10kto100k = 0, tok_1kto10k = 0, tok_100to1k = 0;

  for (const h of holders) {
    const usd = h.value_today;
    if (usd > 50000)          acc_over50000   += 1;
    else if (usd > 10000)     acc_10000to50000 += 1;
    else if (usd > 5000)      acc_5000to10000 += 1;
    else if (usd > 1000)      acc_1000to5000  += 1;
    else if (usd > 500)       acc_500to1000   += 1;
    else if (usd > 100)       acc_100to500    += 1;
    else                      acc_under100    += 1;
    if (usd > 100)            acc_over100     += 1;

    const a = h.amount;
    if (a > 100_000_000)      tok_over100M   += 1;
    else if (a > 10_000_000)  tok_10Mto100M  += 1;
    else if (a > 5_000_000)   tok_5Mto10M    += 1;
    else if (a > 1_000_000)   tok_1Mto5M     += 1;
    else if (a > 100_000)     tok_100kto1M   += 1;
    else if (a > 10_000)      tok_10kto100k  += 1;
    else if (a > 1_000)       tok_1kto10k    += 1;
    else if (a > 100)         tok_100to1k    += 1;
  }

  const snap: any = {};
  snap.ca    = asset.mint;
  snap.runts = String(Math.floor(Date.now() / 1000));
  snap.when  = new Date().toISOString();
  snap.an_perc_top10   = an_perc_top10;
  snap.an_perc_top20   = an_perc_top20;
  snap.an_perc_top50   = an_perc_top50;
  snap.an_perc_top100  = an_perc_top100;
  snap.an_perc_bigpool = an_perc_bigpool;
  snap.liq_bigpool   = an_perc_bigpool;
  snap.liq_top1_10   = top1_10;
  snap.liq_top11_20  = top11_20;
  snap.liq_top21_50  = top21_50;
  snap.liq_top51_100 = top51_100;
  snap.liq_others    = others;
  snap.acc_over50000    = acc_over50000;
  snap.acc_10000to50000 = acc_10000to50000;
  snap.acc_5000to10000  = acc_5000to10000;
  snap.acc_1000to5000   = acc_1000to5000;
  snap.acc_500to1000    = acc_500to1000;
  snap.acc_100to500     = acc_100to500;
  snap.acc_under100     = acc_under100;
  snap.tok_over100M  = tok_over100M;
  snap.tok_10Mto100M = tok_10Mto100M;
  snap.tok_5Mto10M   = tok_5Mto10M;
  snap.tok_1Mto5M    = tok_1Mto5M;
  snap.tok_100kto1M  = tok_100kto1M;
  snap.tok_10kto100k = tok_10kto100k;
  snap.tok_1kto10k   = tok_1kto10k;
  snap.tok_100to1k   = tok_100to1k;
  snap.nholders_full     = total;
  snap.nholders_over100  = acc_over100;
  snap.nholders_under100 = acc_under100;
  return snap;
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
