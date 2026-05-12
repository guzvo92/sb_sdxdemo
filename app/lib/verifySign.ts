// Helper de verificacion ed25519 + check de admin file-based.
// Compartido por /api/community_request y /api/regenerate.

import { readFile } from "fs/promises";
import path from "path";
import nacl from "tweetnacl";
import bs58 from "bs58";

const ADMINS_PATH = path.join(process.cwd(), "public", "admins.json");

// Verifica una firma ed25519 contra el mensaje, con pubkey y firma en
// base58/base64 respectivamente. Devuelve false ante cualquier error.
export function verifyEd25519(pubkeyB58: string, msg: string, sigB64: string): boolean {
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

// Chequea que la pubkey este listada en public/admins.json.
export async function isAdmin(pubkeyB58: string): Promise<boolean> {
  try {
    const raw = await readFile(ADMINS_PATH, "utf-8");
    const data = JSON.parse(raw);
    const admins: any[] = Array.isArray(data.admins) ? data.admins : [];
    return admins.some(a => a.pubkey === pubkeyB58);
  } catch {
    return false;
  }
}

// Parsea un mensaje canonico "<prefix>:<unix_ts>" y devuelve { prefix, ts }.
// Aplica al patron usado por /regenerate: "satelldex-demo:regenerate:<ts>".
export function parseTimestampedMsg(msg: string, expectedPrefix: string): { ts: number } | null {
  if (!msg.startsWith(expectedPrefix + ":")) return null;
  const remainder = msg.slice(expectedPrefix.length + 1);
  const ts = parseInt(remainder);
  if (!Number.isFinite(ts)) return null;
  return { ts };
}
