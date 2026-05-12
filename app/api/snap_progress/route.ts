// GET /api/snap_progress — lee public/demo-data/snap_progress.json y lo
// devuelve para que el front (boton REGEN) poree el estado del snapshot
// en curso. Sin auth · lectura publica.

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const PROGRESS_PATH = path.join(process.cwd(), "public", "demo-data", "snap_progress.json");

export async function GET() {
  try {
    const raw = await readFile(PROGRESS_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({
      status:        "idle",
      last_update:   null,
      phase:         null,
      current_total: 0,
      completed:     [],
    });
  }
}
