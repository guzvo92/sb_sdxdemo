// GET /api/snap_index — lista carpetas de fecha YYYY_MM_DD__HH_MM (o
// el formato viejo YYYY_MM_DD sin sufijo) en public/demo-data/snapshots/
// y devuelve cual es la mas reciente. Sin auth · lectura publica. El
// front lo usa para construir los paths de fetch a
// snapshots/<latest>/<slug>.json sin hardcodear la fecha.

import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

const SNAPSHOTS_DIR = path.join(process.cwd(), "public", "demo-data", "snapshots");
const HOLDERS_DIR   = path.join(process.cwd(), "public", "demo-data", "holders");
const DEXSCRAP_DIR  = path.join(process.cwd(), "public", "demo-data", "dexscraptokens");

// Acepta YYYY_MM_DD y YYYY_MM_DD__HH_MM. Lexicografico = cronologico
// porque __HH_MM ordena despues del dia desnudo.
const DATE_FOLDER_RE = /^\d{4}_\d{2}_\d{2}(__\d{2}_\d{2})?$/;

async function listDateFolders(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && DATE_FOLDER_RE.test(e.name))
      .map(e => e.name)
      .sort();
  } catch {
    return [];
  }
}

export async function GET() {
  const [snapshots, holders, dexscraptokens] = await Promise.all([
    listDateFolders(SNAPSHOTS_DIR),
    listDateFolders(HOLDERS_DIR),
    listDateFolders(DEXSCRAP_DIR),
  ]);

  const last = (arr: string[]) => arr.length > 0 ? arr[arr.length - 1] : null;

  return NextResponse.json(
    {
      ok: true,
      snapshots:      { folders: snapshots,      latest: last(snapshots) },
      holders:        { folders: holders,        latest: last(holders) },
      dexscraptokens: { folders: dexscraptokens, latest: last(dexscraptokens) },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
