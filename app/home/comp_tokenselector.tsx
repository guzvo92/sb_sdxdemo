"use client";

// Selector de tokens free agrupado por categoria + 2 cards (VIP + Alpha tester).
// Adaptado al demo: en vez de pegar al SDK del backend, lee directo los JSONs
// estaticos en public/demo-data/. VipInterestButton es informativo solamente
// (sin endpoint POST en demo).

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

interface Category {
  id: number;
  name: string;
  color: string;
  tokens: string[];
}

// Card grande VIP: link al dashboard /tracked del demo.
export function VipCard() {
  return (
    <a
      href="/tracked"
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        background: "linear-gradient(135deg, #06b6d4 0%, #818cf8 100%)",
        border: "none",
        borderRadius: "6px",
        textDecoration: "none",
        boxShadow: "0 0 20px rgba(6,182,212,0.3)",
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.3)",
        padding: "16px 28px",
        borderRight: "1px solid rgba(255,255,255,0.2)",
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "16px",
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.15em",
          textShadow: "0 0 12px rgba(6,182,212,0.9)",
        }}>
          VIP
        </span>
      </div>
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 24px",
        flex: 1,
      }}>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          fontWeight: 700,
          color: "#000",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          Try an example of our VIP metrics indexer
        </span>
      </div>
    </a>
  );
}

// Card ALPHA VIP TESTER. En el demo no hay backend para registrar interes
// (en prod hace POST a /api/vipinterest_submit). Aca solo muestra el copy
// y un boton que abre el wallet adapter para mostrar "wallet listo".
export function VipInterestButton() {
  const { connected, publicKey } = useWallet();

  return (
    <div style={{
      border: "1px solid rgba(129,140,248,0.45)",
      borderRadius: "10px",
      background: "linear-gradient(160deg, rgba(129,140,248,0.07) 0%, rgba(6,182,212,0.04) 100%)",
      padding: "20px 28px",
      boxShadow: "0 0 28px rgba(129,140,248,0.1)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      maxWidth: "460px",
      textAlign: "center",
    }}>
      <p style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "11px",
        color: "#a78bfa",
        letterSpacing: "0.12em",
        textShadow: "0 0 14px rgba(167,139,250,0.6)",
        margin: 0,
      }}>
        ALPHA VIP TESTER
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748b", textDecoration: "line-through" }}>
          $40 / month
        </span>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "13px" }}>
          <span style={{ color: "#06b6d4" }}>$25</span>
          <span style={{ color: "#94a3b8", fontSize: "9px" }}> / first 30 days</span>
        </span>
      </div>

      <p style={{
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
        letterSpacing: "0.03em",
        lineHeight: 1.7,
        margin: 0,
      }}>
        Early adopters get exclusive access to our full <span style={{ color: "#a78bfa", fontWeight: 700 }}>alpha VIP tester</span> analytics suite:
        <ul style={{ margin: "8px 0 8px 0", padding: 0, listStyle: "none", textAlign: "center" }}>
          <li style={{ padding: "2px 0" }}>· deep holder intel</li>
          <li style={{ padding: "2px 0" }}>· snapshot history graphs</li>
          <li style={{ padding: "2px 0" }}>· performance vision vs other tokens in the same narrative</li>
        </ul>
        all for <span style={{ color: "#06b6d4", fontWeight: 700 }}>25 USDC</span>.
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {!connected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <p style={{ fontFamily: "monospace", fontSize: "8px", color: "#475569", margin: 0 }}>Connect wallet to register interest</p>
            <WalletMultiButton />
          </div>
        ) : (
          <p style={{ fontFamily: "monospace", fontSize: "9px", color: "#06b6d4", letterSpacing: "0.1em", margin: 0 }}>
            ✓ {publicKey?.toBase58().slice(0, 6)}…{publicKey?.toBase58().slice(-6)} — demo only · alpha registration disabled
          </p>
        )}
      </div>
    </div>
  );
}

// Selector de tokens free, agrupado por categoria. En el demo, "free" =
// todos los tokens listados en global_history.json (no hay separacion
// free/vip a nivel API porque no hay API). Hace match contra categories.json
// para colorearlos por categoria.
export function Comp_TokenSelector() {
  const { connected } = useWallet();
  const [tokens,     setTokens]     = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [catRes, globalRes] = await Promise.all([
          fetch("/demo-data/global/categories.json").then(r => r.json()),
          fetch("/demo-data/global/global_history.json").then(r => r.json()),
        ]);
        const tokenNames: string[] = globalRes.tokens?.map((t: any) => t.token_name) || [];
        setTokens(tokenNames);
        if (catRes.ok) setCategories(catRes.categories || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const tokenCatMap: Record<string, Category> = {};
  for (const cat of categories) {
    for (const tok of cat.tokens) {
      tokenCatMap[tok] = cat;
    }
  }

  const uncategorized = tokens.filter(tok => !tokenCatMap[tok]);

  const renderTokenSection = (label: string, color: string, tokenList: string[]) => {
    if (tokenList.length === 0) return null;
    return (
      <div className="freetokens-section" style={{ marginBottom: "32px", width: "100%" }}>
        <div className="freetokens-header" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", justifyContent: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span className="freetokens-label" style={{ fontFamily: "monospace", fontSize: "9px", fontWeight: 700, color: color, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {label}
          </span>
          <span style={{ fontFamily: "monospace", fontSize: "8px", color: "#475569" }}>
            {tokenList.length}
          </span>
        </div>
        <div className="freetokens-grid" style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
          {tokenList.map((tok) => (
            <a
              key={tok}
              href={`/tracked?token=${tok}`}
              className="freetokens-chip"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0f1623",
                border: "1px solid #164e63",
                borderRadius: "4px",
                padding: "8px 16px",
                textDecoration: "none",
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.06em" }}>
                {tok.toUpperCase()}
              </span>
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="freetokens-wrap"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        border: "1px solid rgba(129,140,248,0.45)",
        borderRadius: "10px",
        background: "linear-gradient(160deg, rgba(129,140,248,0.07) 0%, rgba(6,182,212,0.04) 100%)",
        boxShadow: "0 0 28px rgba(129,140,248,0.1)",
        padding: "24px 20px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginBottom: "20px" }}>
        <p style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "10px",
          color: "#a78bfa",
          letterSpacing: "0.12em",
          textShadow: "0 0 14px rgba(167,139,250,0.6)",
          margin: 0,
        }}>
          TRY FREE TOKENS PANEL
        </p>
        <span style={{ fontFamily: "monospace", fontSize: "10px", letterSpacing: "0.04em" }}>
          <span style={{ color: "#ffffff" }}>Last snapshot — </span>
          {connected ? (
            <span style={{ color: "#4ade80" }}>ready</span>
          ) : (
            <span style={{ color: "#94a3b8" }}>no wallet connected</span>
          )}
        </span>
      </div>

      {loading ? (
        <div style={{ color: "#475569", fontFamily: "monospace", fontSize: "10px" }}>Loading...</div>
      ) : (
        <>
          {categories.map(cat => renderTokenSection(cat.name, cat.color, cat.tokens))}
          {uncategorized.length > 0 && renderTokenSection("Others", "#475569", uncategorized)}
        </>
      )}
    </div>
  );
}
