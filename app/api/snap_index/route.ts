// GET /api/snap_index — lista carpetas de fecha YYYY_MM_DD en
// public/demo-data/snapshots/ y devuelve cual es la mas reciente.
// Sin auth · lectura publica. El front lo usa para construir los paths
// de fetch a snapshots/<latest>/<slug>.json sin hardcodear la fecha.

import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

const SNAPSHOTS_DIR = path.join(process.cwd(), "public", "demo-data", "snapshots");
const HOLDERS_DIR   = path.join(process.cwd(), "public", "demo-data", "holders");
const DEXSCRAP_DIR  = path.join(process.cwd(), "public", "demo-data", "dexscraptokens");

// Lista entries de un dir y filtra solo subcarpetas con nombre YYYY_MM_DD.
async function listDateFolders(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && /^\d{4}_\d{2}_\d{2}$/.test(e.name))
      .map(e => e.name)
      .sort(); // YYYY_MM_DD ordena lexicograficamente como cronologico
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
