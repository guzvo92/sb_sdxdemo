"use client";

// Panel de "Community Token Requests" en el hero. En el demo no hay backend
// Flask: el endpoint /api/community_request es un Route Handler de Next.js
// que lee/escribe public/demo-data/community_requests.json. El boton
// "REQUEST A TOKEN" lleva a /requiretoken donde se firma y se submitea.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

function truncAddr(addr: string) {
  if (addr.length < 12) return addr;
  return addr.slice(0, 5) + "…" + addr.slice(-5);
}

function fmtFdv(raw: string | number | null | undefined) {
  const n = parseFloat(String(raw ?? ""));
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function SecCommunityReq() {
  const { connected } = useWallet();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch("/api/community_request")
      .then(r => r.json())
      .then(res => { if (res.ok) setRequests((res.requests || []).slice(0, 8)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        border: "1px solid rgba(6,182,212,0.45)",
        borderRadius: "10px",
        background: "linear-gradient(160deg, rgba(6,182,212,0.07) 0%, rgba(129,140,248,0.04) 100%)",
        boxShadow: "0 0 28px rgba(6,182,212,0.1)",
        padding: "24px 20px",
      }}
    >
      {/* encabezado */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <p style={{
          fontFamily:    "'Press Start 2P', monospace",
          fontSize:      10,
          color:         "#ffffff",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom:  10,
        }}>
          Community
        </p>
        <h2 style={{
          fontFamily:    "'Press Start 2P', monospace",
          fontSize:      13,
          color:         "#e2e8f0",
          letterSpacing: "0.05em",
          marginBottom:  12,
        }}>
          Token <span style={{ color: "#06b6d4" }}>Requests</span>
        </h2>
        <p style={{ color: "#ffffff", fontSize: "0.82rem", maxWidth: 480, margin: "0 auto" }}>
          Vote to track a Solana token. The team reviews community requests and adds tokens manually.
        </p>
      </div>

      {/* tabla */}
      {!loading && requests.length > 0 && (
        <div style={{
          background:   "#0d1117",
          border:       "1px solid #1e293b",
          borderRadius: 10,
          overflow:     "hidden",
          marginBottom: 32,
        }}>
          <table className="hometokenreq-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                {[
                  { label: "#",     cls: "" },
                  { label: "Token", cls: "hometokenreq-th-tokaddr" },
                  { label: "Name",  cls: "" },
                  { label: "Price", cls: "" },
                  { label: "FDV",   cls: "hometokenreq-th-fdv" },
                  { label: "Pools", cls: "hometokenreq-th-pools" },
                  { label: "Votes", cls: "" },
                ].map((h, i) => (
                  <th key={h.label} className={h.cls} style={{ color: "#ffffff", fontSize: "0.6rem", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: i === 6 ? "right" : "left", padding: "10px 8px" }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => (
                <tr key={r.token_address} style={{ borderTop: "1px solid #0f172a" }}>
                  <td style={{ color: "#334155", fontSize: "0.68rem", fontFamily: "monospace", padding: "9px 8px" }}>{i + 1}</td>
                  <td className="hometokenreq-td-tokaddr" style={{ padding: "9px 8px" }}>
                    <a
                      href={`https://solscan.io/token/${r.token_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#38bdf8", fontFamily: "monospace", fontSize: "0.72rem", textDecoration: "none" }}
                      title={r.token_address}
                    >
                      {truncAddr(r.token_address)}
                    </a>
                  </td>
                  <td style={{ padding: "9px 8px" }}>
                    {r.symbol ? <span className="hometokenreq-name-sym" style={{ color: "#06b6d4", fontFamily: "monospace", fontSize: "0.72rem", fontWeight: 700 }}>{r.symbol}</span> : <span style={{ color: "#334155", fontFamily: "monospace", fontSize: "0.72rem" }}>—</span>}
                    {r.name ? <span className="hometokenreq-name-full" style={{ color: "#64748b", fontFamily: "monospace", fontSize: "0.65rem", marginLeft: 5 }}>{r.name}</span> : null}
                  </td>
                  <td style={{ color: "#a3e635", fontFamily: "monospace", fontSize: "0.72rem", padding: "9px 8px" }}>
                    {r.price_usd ? `$${parseFloat(String(r.price_usd)).toFixed(6)}` : "—"}
                  </td>
                  <td className="hometokenreq-td-fdv" style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "0.72rem", padding: "9px 8px" }}>
                    {fmtFdv(r.fdv_mc)}
                  </td>
                  <td className="hometokenreq-td-pools" style={{ color: "#64748b", fontFamily: "monospace", fontSize: "0.72rem", padding: "9px 8px" }}>
                    {r.npools ?? "—"}
                  </td>
                  <td style={{ textAlign: "right", padding: "9px 8px" }}>
                    <span className="hometokenreq-votes-pill" style={{ background: "#0c3a5a", color: "#06b6d4", borderRadius: 999, padding: "3px 12px", fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 700 }}>
                      {r.votes ?? 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* vacio post-load */}
      {!loading && requests.length === 0 && (
        <p style={{ color: "#475569", fontFamily: "monospace", fontSize: "0.72rem", textAlign: "center", marginBottom: 24 }}>
          No community requests yet. Be the first to suggest a token.
        </p>
      )}

      {/* CTA — wallet no conectada */}
      {!connected && (
        <div style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            14,
          background:     "#0d1117",
          border:         "1px solid #1e293b",
          borderRadius:   10,
          padding:        "28px 24px",
          marginBottom:   24,
        }}>
          <p style={{
            color:         "#475569",
            fontFamily:    "monospace",
            fontSize:      "0.72rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            margin:        0,
          }}>
            Connect your wallet to request a token
          </p>
          <WalletMultiButton />
        </div>
      )}

      {/* CTA — wallet conectada */}
      {connected && (
        <div style={{ textAlign: "center" }}>
          <a
            href="/requiretoken"
            style={{
              display:        "inline-block",
              background:     "transparent",
              border:         "1px solid #06b6d4",
              color:          "#06b6d4",
              padding:        "10px 28px",
              borderRadius:   6,
              fontSize:       "0.72rem",
              fontFamily:     "monospace",
              fontWeight:     700,
              letterSpacing:  "0.1em",
              textDecoration: "none",
            }}
          >
            REQUEST A TOKEN →
          </a>
        </div>
      )}
    </div>
  );
}
