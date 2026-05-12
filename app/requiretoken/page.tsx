"use client";

// /requiretoken — form para que cualquier wallet conectada pida que un token
// se agregue al panel de community requests. Firma un mensaje canonico
// "satelldex-demo:require-token:<unix_ts>:<token_address>" y manda POST
// al endpoint /api/community_request que persiste en JSON.

import { useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

type Status = "idle" | "signing" | "submitting" | "done" | "error";

export default function RequireTokenPage() {
  const { connected, publicKey, signMessage } = useWallet();
  const [tokenAddress, setTokenAddress] = useState("");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [fdvMc, setFdvMc] = useState("");
  const [npools, setNpools] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrMsg(null);
    if (!publicKey || !signMessage) {
      setErrMsg("Wallet not connected");
      return;
    }
    if (tokenAddress.trim().length < 32) {
      setErrMsg("Token address looks invalid");
      return;
    }

    setStatus("signing");
    try {
      const ts = Math.floor(Date.now() / 1000);
      const msg = `satelldex-demo:require-token:${ts}:${tokenAddress.trim()}`;
      const sigBytes = await signMessage(new TextEncoder().encode(msg));
      // serializa la firma a base64 sin Buffer (compat browser-safe)
      let binary = "";
      for (let i = 0; i < sigBytes.length; i++) binary += String.fromCharCode(sigBytes[i]);
      const sigB64 = btoa(binary);

      setStatus("submitting");
      const payload: any = {};
      payload.token_address = tokenAddress.trim();
      if (symbol.trim())   payload.symbol    = symbol.trim();
      if (name.trim())     payload.name      = name.trim();
      if (priceUsd.trim()) payload.price_usd = priceUsd.trim();
      if (fdvMc.trim())    payload.fdv_mc    = fdvMc.trim();
      if (npools.trim())   payload.npools    = parseInt(npools.trim());

      const res = await fetch("/api/community_request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          pubkey:        publicKey.toBase58(),
          message:       msg,
          signature_b64: sigB64,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrMsg(data.error || `HTTP ${res.status}`);
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch (e: any) {
      setErrMsg(e?.message ?? "signature failed");
      setStatus("error");
    }
  };

  return (
    <div style={{ background: "#0a0e1a", minHeight: "100vh", color: "#e2e8f0" }}>
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
        <a href="/" style={{ color: "#06b6d4", fontFamily: "monospace", fontSize: 11, textDecoration: "none" }}>← back to home</a>

        <h1 style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "clamp(14px, 2vw, 22px)",
          color: "#fff",
          letterSpacing: "0.04em",
          marginTop: 24, marginBottom: 8,
          background: "linear-gradient(90deg, #06b6d4 0%, #818cf8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Request a Token
        </h1>
        <p style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 12, marginBottom: 28 }}>
          Sign with your wallet to request tracking. Your pubkey is recorded as the submitter.
          Duplicate token addresses just add another vote.
        </p>

        {!connected && (
          <div style={{
            background: "#0f1623",
            border: "1px solid #1e293b",
            borderRadius: 10,
            padding: "24px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <p style={{ color: "#475569", fontFamily: "monospace", fontSize: 11 }}>connect wallet first</p>
            <WalletMultiButton />
          </div>
        )}

        {connected && (
          <div style={{
            background: "#0f1623",
            border: "1px solid #164e63",
            borderRadius: 10,
            padding: "24px",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <Field label="Token address (CA · required)" value={tokenAddress} onChange={setTokenAddress} placeholder="So11111111111111111111111111111111111111112" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Symbol" value={symbol} onChange={setSymbol} placeholder="SOL" />
              <Field label="Name"   value={name}   onChange={setName}   placeholder="Wrapped SOL" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Price USD" value={priceUsd} onChange={setPriceUsd} placeholder="0.000123" />
              <Field label="FDV / MC"  value={fdvMc}    onChange={setFdvMc}    placeholder="1500000" />
              <Field label="Pools"     value={npools}   onChange={setNpools}   placeholder="3" />
            </div>

            <button
              onClick={handleSubmit}
              disabled={status === "signing" || status === "submitting" || status === "done"}
              style={{
                marginTop: 8,
                background: status === "done" ? "#22c55e" : "linear-gradient(135deg, #06b6d4 0%, #818cf8 100%)",
                color: "#0a0e1a",
                border: "none",
                padding: "12px 22px",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                borderRadius: 6,
                cursor: (status === "signing" || status === "submitting" || status === "done") ? "wait" : "pointer",
              }}
            >
              {status === "signing"    && "SIGNING…"}
              {status === "submitting" && "SUBMITTING…"}
              {status === "done"       && "✓ SUBMITTED"}
              {(status === "idle" || status === "error") && "SIGN & SUBMIT REQUEST"}
            </button>

            {errMsg && (
              <p style={{ color: "#f87171", fontFamily: "monospace", fontSize: 11 }}>{errMsg}</p>
            )}
            {status === "done" && (
              <p style={{ color: "#22c55e", fontFamily: "monospace", fontSize: 11 }}>
                Saved. Your request will appear on the home shortly.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Input estilizado con label encima. Mantiene el aspecto del demo
// (mono + bordes cyan).
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "#0a0e1a",
          border: "1px solid #1e293b",
          borderRadius: 5,
          padding: "10px 12px",
          color: "#e2e8f0",
          fontFamily: "monospace",
          fontSize: 12,
          outline: "none",
        }}
      />
    </label>
  );
}
