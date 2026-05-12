"use client";

// Sign gate especifico para vistas hackathon (/hackathonview + /globalhackathon).
// Ciclo: el juez conecta wallet -> firma un mensaje canonico -> se persiste en
// localStorage por 24h. Vencido el plazo o cambio de wallet, vuelve a pedir firma.
// Sin POST al backend, sin cookie server-side: aislado del refactor de auth
// per-request del resto del sitio. Esta carpeta /hackathonview es temporal.

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const STORAGE_KEY  = "sat_hackathon_signed";
const SIGN_VALID_MS = 24 * 60 * 60 * 1000; // 24h
const SIGN_MSG = "satelldex-hackathon:judge-access";

interface Props {
  children: React.ReactNode;
  title?: string;
  view?: "hackathon_view" | "hackathon_global"; // se reporta al backend
}

export default function HackathonSignGate({ children, title = "Hackathon Judge Access", view = "hackathon_view" }: Props) {
  const { connected, publicKey, signMessage } = useWallet();
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Al cargar: chequea si ya hay firma valida en localStorage para este pubkey
  useEffect(() => {
    if (!publicKey) { setSigned(false); return; }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.pubkey !== publicKey.toBase58()) return;
      if (Date.now() - parsed.ts > SIGN_VALID_MS) return;
      setSigned(true);
    } catch {}
  }, [publicKey]);

  const handleSign = async () => {
    if (!connected || !publicKey || !signMessage || signing) return;
    setSigning(true);
    setError(null);
    try {
      const ts = Date.now();
      const msg = `${SIGN_MSG}:${ts}`;
      const sigBytes = await signMessage(new TextEncoder().encode(msg));
      // base64 (browser-safe)
      let binary = "";
      for (let i = 0; i < sigBytes.length; i++) binary += String.fromCharCode(sigBytes[i]);
      const sigB64 = btoa(binary);

      // persiste sesion local (gate UX 24h)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        pubkey: publicKey.toBase58(),
        ts,
        msg,
      }));

      // reporta la firma al backend para que aparezca en panel admin -> SIGNS
      // (NO bloquea el render si falla — el gate sigue siendo localStorage).
      try {
        await fetch("/api/hackathon_sign", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            pubkey:        publicKey.toBase58(),
            signature_b64: sigB64,
            message:       msg,
            view:          view,
          }),
        });
      } catch (_) { /* silenciar — la sesion local ya esta firmada */ }

      setSigned(true);
    } catch (e: any) {
      setError(e?.message ?? "signature failed");
    } finally {
      setSigning(false);
    }
  };

  if (signed) return <>{children}</>;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: "#0d1424",
        border: "1px solid color-mix(in srgb, var(--accent) 50%, transparent)",
        borderRadius: 10,
        padding: "32px 28px",
        maxWidth: 460,
        width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,.5), 0 0 24px color-mix(in srgb, var(--accent) 18%, transparent)",
        fontFamily: "monospace",
        color: "#e2e8f0",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          color: "var(--accent)",
          letterSpacing: "0.12em",
          marginBottom: 14,
        }}>
          ◈ {title.toUpperCase()} ◈
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 22, lineHeight: 1.6 }}>
          For Solana Frontier Hackathon 2026 judges.
          <br />Connect your wallet and sign one message to access.
        </p>

        {!connected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <p style={{ fontSize: 11, color: "#fbbf24" }}>1. Connect a Solana wallet</p>
            <WalletMultiButton />
          </div>
        )}

        {connected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <p style={{ fontSize: 11, color: "#22c55e" }}>
              ✓ Connected: {publicKey?.toBase58().slice(0, 6)}…{publicKey?.toBase58().slice(-6)}
            </p>
            <p style={{ fontSize: 11, color: "#fbbf24" }}>2. Sign access message</p>
            <button
              onClick={handleSign}
              disabled={signing}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 10,
                background: "var(--accent)",
                color: "#0a0e1a",
                border: "none",
                borderRadius: 4,
                padding: "12px 22px",
                letterSpacing: "0.1em",
                cursor: signing ? "wait" : "pointer",
                opacity: signing ? 0.6 : 1,
              }}
            >
              {signing ? "SIGNING..." : "AUTHORIZE"}
            </button>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 11, color: "#fca5a5", marginTop: 14 }}>{error}</p>
        )}

        <p style={{ fontSize: 9, color: "#475569", marginTop: 24 }}>
          Session valid for 24 hours · stored only in your browser
        </p>
      </div>
    </div>
  );
}
