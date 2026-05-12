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

// Cache singleton del index dentro del ciclo de vida de la pagina.
let cachedIdx: SnapIndex | null = null;
async function getIdx(): Promise<SnapIndex> {
  if (cachedIdx) return cachedIdx;
  const r = await fetch("/api/snap_index", { cache: "no-store" });
  const d = await r.json();
  cachedIdx = {
    snapshots:      d.snapshots      ?? { folders: [], latest: null },
    holders:        d.holders        ?? { folders: [], latest: null },
    dexscraptokens: d.dexscraptokens ?? { folders: [], latest: null },
  };
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

  // Lee el snapshot rico del folder mas reciente. El backend prod devuelve
  // { ok, token, idsnap, data }. Aca devolvemos el snapshot directo como
  // data y rellenamos idsnap con el runts.
  async fetch_snapshot_latest(token: string): Promise<{ ok: boolean; token: string; idsnap: number; data: any }> {
    try {
      const idx = await getIdx();
      const folder = idx.snapshots.latest;
      if (!folder) return { ok: false, token, idsnap: 0, data: null };
      const r = await fetch(`/demo-data/snapshots/${folder}/${token}.json`, { cache: "no-store" });
      if (!r.ok) return { ok: false, token, idsnap: 0, data: null };
      const data = await r.json();
      return { ok: true, token, idsnap: parseInt(data?.runts ?? "0"), data };
    } catch {
      return { ok: false, token, idsnap: 0, data: null };
    }
  }

  // Devuelve el agregado multi-token del global_history. Si el JSON ya
  // tiene los tokens reales, los devuelve directo.
  async fetch_globalrun_history(): Promise<{ ok: boolean; tokens: any[] }> {
    try {
      const r = await fetch("/demo-data/global/global_history.json", { cache: "no-store" });
      const d = await r.json();
      return { ok: !!d.ok, tokens: Array.isArray(d.tokens) ? d.tokens : [] };
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
