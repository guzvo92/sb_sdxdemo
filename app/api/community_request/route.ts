// Endpoint CRUD para community token requests del demo.
//
//   GET  /api/community_request           -> lista ordenada por votes desc
//   POST /api/community_request           -> append un nuevo request
//
// Persistencia: public/demo-data/community_requests.json (file-based, sin DB).
// El POST exige firma ed25519 valida: la pubkey firma
//   "satelldex-demo:require-token:<unix_ts>:<token_address>"
// con su wallet y manda { pubkey, message, signature_b64, payload }.
// El server verifica con tweetnacl, valida anti-replay (+/-300s) y appende.

import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import nacl from "tweetnacl";
import bs58 from "bs58";

// path al JSON source of truth (dentro del bind mount del container)
const JSON_PATH = path.join(process.cwd(), "public", "demo-data", "community_requests.json");
const REPLAY_WINDOW_S = 300;

// Lee el JSON del filesystem; si no existe, devuelve estructura base.
async function readRequests(): Promise<any> {
  try {
    const raw = await readFile(JSON_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { ok: true, requests: [] };
  }
}

// Reescribe el JSON entero (file-based, sin lockfile — el demo no espera
// concurrencia alta y el container es single-instance).
async function writeRequests(data: any): Promise<void> {
  await writeFile(JSON_PATH, JSON.stringify(data, null, 2));
}

// GET — devuelve { ok, requests } ordenados por votes desc.
export async function GET() {
  const data = await readRequests();
  const requests = Array.isArray(data.requests) ? data.requests.slice() : [];
  requests.sort((a: any, b: any) => (b.votes ?? 0) - (a.votes ?? 0));
  return NextResponse.json({ ok: true, requests });
}

// Valida la forma del body antes de tocar firma.
function validateBody(body: any): string | null {
  if (!body || typeof body !== "object") return "bad_payload";
  if (typeof body.pubkey !== "string") return "missing_pubkey";
  if (typeof body.message !== "string") return "missing_message";
  if (typeof body.signature_b64 !== "string") return "missing_signature";
  if (!body.payload || typeof body.payload !== "object") return "missing_payload";
  if (typeof body.payload.token_address !== "string" || body.payload.token_address.length < 32) {
    return "invalid_token_address";
  }
  return null;
}

// Verifica firma ed25519 con tweetnacl + bs58 (pubkey y firma en base58/base64).
function verifySignature(pubkeyB58: string, msg: string, sigB64: string): boolean {
  try {
    const pubkeyBytes = bs58.decode(pubkeyB58);
    if (pubkeyBytes.length !== 32) return false;
    const msgBytes = new TextEncoder().encode(msg);
    const sigBytes = Uint8Array.from(Buffer.from(sigB64, "base64"));
    if (sigBytes.length !== 64) return false;
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes);
  } catch {
    return false;
  }
}

// POST — appende un nuevo request despues de validar firma + anti-replay.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const validation = validateBody(body);
  if (validation) {
    return NextResponse.json({ ok: false, error: validation }, { status: 400 });
  }

  // Parsear el unix_ts del mensaje canonico:
  // "satelldex-demo:require-token:<unix_ts>:<token_address>"
  const parts = body.message.split(":");
  if (parts.length < 4 || parts[0] !== "satelldex-demo" || parts[1] !== "require-token") {
    return NextResponse.json({ ok: false, error: "bad_message_format" }, { status: 400 });
  }
  const ts = parseInt(parts[2]);
  if (!Number.isFinite(ts)) {
    return NextResponse.json({ ok: false, error: "bad_timestamp" }, { status: 400 });
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > REPLAY_WINDOW_S) {
    return NextResponse.json({ ok: false, error: "replay" }, { status: 401 });
  }
  // token_address en el mensaje debe matchear el payload
  const msgTokenAddr = parts.slice(3).join(":");
  if (msgTokenAddr !== body.payload.token_address) {
    return NextResponse.json({ ok: false, error: "token_mismatch" }, { status: 400 });
  }

  if (!verifySignature(body.pubkey, body.message, body.signature_b64)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const data = await readRequests();
  const requests: any[] = Array.isArray(data.requests) ? data.requests : [];

  // Si ya existe el mismo token_address, le suma 1 al voto del request
  // existente en vez de duplicar. Esto convierte el "request" en tambien
  // una accion de voto si la wallet vuelve a firmar el mismo CA.
  const existingIdx = requests.findIndex((r: any) => r.token_address === body.payload.token_address);
  if (existingIdx >= 0) {
    requests[existingIdx].votes = (requests[existingIdx].votes ?? 0) + 1;
    requests[existingIdx].last_vote_by = body.pubkey;
    requests[existingIdx].last_vote_at = ts;
  } else {
    const newRequest: any = {};
    newRequest.token_address = body.payload.token_address;
    newRequest.symbol = body.payload.symbol ?? "";
    newRequest.name = body.payload.name ?? "";
    newRequest.price_usd = body.payload.price_usd ?? null;
    newRequest.fdv_mc = body.payload.fdv_mc ?? null;
    newRequest.npools = body.payload.npools ?? null;
    newRequest.votes = 1;
    newRequest.submitted_by = body.pubkey;
    newRequest.submitted_at = ts;
    newRequest.message = body.message;
    newRequest.signature_b64 = body.signature_b64;
    requests.push(newRequest);
  }

  data.requests = requests;
  data.ok = true;
  await writeRequests(data);

  return NextResponse.json({ ok: true, request: existingIdx >= 0 ? requests[existingIdx] : requests[requests.length - 1] });
}
