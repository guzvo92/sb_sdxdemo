"use client";

// SatellDex Demo — single-file proof-of-concept con visual del prod
// (hero con glow, grid background, paleta cyan/violeta, Press Start 2P).
// Sign gate ed25519 → muestra tokens trackeados + community gauge gamificado.
// Persistencia: localStorage. Sin DB, sin backend, sin scraping.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

// ────────────────────────────────────────────────────────────────
// Types & constants
// ────────────────────────────────────────────────────────────────
type TokenMeta = {
  slug: string; name: string; symbol: string; ca: string;
  price: number; fdv: number; holders: number;
};
type Snapshot = Record<string, number | string>;
type Holder = { address: string; amount: number; usd: number };

const SIGN_MSG = "satelldex-demo:view-tokens";
const VOTE_THRESHOLD = 10;
const PENDING_TOKENS = [
  { slug: "questrx",  symbol: "QUEST",  name: "Quest Realms"   },
  { slug: "cybernet", symbol: "CYBR",   name: "Cybernet AI"    },
  { slug: "lumarpro", symbol: "LUMAR",  name: "Lumar Protocol" },
];

const LIQ_BRACKETS = [
  { key: "bigpool",   label: "Pool",       color: "#b45309" },
  { key: "top1_10",   label: "Top 1–10",   color: "#0e9451" },
  { key: "top11_20",  label: "Top 11–20",  color: "#ef4444" },
  { key: "top21_50",  label: "Top 21–50",  color: "#d45911" },
  { key: "top51_100", label: "Top 51–100", color: "#06b6d4" },
  { key: "others",    label: "Others",     color: "#94a3b8" },
];
// Brackets de Account Distribution con etiquetas marinas + iconos.
// Cada bracket lleva un nombre de criatura + emoji para que la card sea
// visualmente distinguible.
const ACC_BRACKETS = [
  { key: "over50000",    label: "+$50k",      color: "#fbbf24", tier: "WHALE",    icon: "🐋" },
  { key: "10000to50000", label: "$10k–$50k",  color: "#fb923c", tier: "SHARK",    icon: "🦈" },
  { key: "5000to10000",  label: "$5k–$10k",   color: "#f43f5e", tier: "DOLPHIN",  icon: "🐬" },
  { key: "1000to5000",   label: "$1k–$5k",    color: "#a855f7", tier: "FISH",     icon: "🐟" },
  { key: "500to1000",    label: "$500–$1k",   color: "#6366f1", tier: "CRAB",     icon: "🦀" },
  { key: "100to500",     label: "$100–$500",  color: "#22c55e", tier: "SHRIMP",   icon: "🦐" },
  { key: "under100",     label: "<$100",      color: "#ef4444", tier: "PLANKTON", icon: "🦠" },
];
const TOKEN_BRACKETS = [
  { key: "over100M",  label: "+100M",      color: "#fbbf24" },
  { key: "10Mto100M", label: "10M–100M",   color: "#fb923c" },
  { key: "5Mto10M",   label: "5M–10M",     color: "#f43f5e" },
  { key: "1Mto5M",    label: "1M–5M",      color: "#a855f7" },
  { key: "100kto1M",  label: "100k–1M",    color: "#6366f1" },
  { key: "10kto100k", label: "10k–100k",   color: "#22c55e" },
  { key: "1kto10k",   label: "1k–10k",     color: "#06b6d4" },
  { key: "100to1k",   label: "100–1k",     color: "#94a3b8" },
];

// ────────────────────────────────────────────────────────────────
export default function Page() {
  const { connected, publicKey, signMessage } = useWallet();
  const [signed,    setSigned]    = useState(false);
  const [signing,   setSigning]   = useState(false);
  const [signErr,   setSignErr]   = useState<string | null>(null);

  const [tokens,    setTokens]    = useState<TokenMeta[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [snap,      setSnap]      = useState<Snapshot | null>(null);
  const [holders,   setHolders]   = useState<Holder[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [votes,     setVotes]     = useState<Record<string, number>>({});
  const [graduated, setGraduated] = useState<string[]>([]);
  const [voteToast, setVoteToast] = useState<string | null>(null);
  const [voting,    setVoting]    = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = localStorage.getItem("demo_votes");
      if (v) setVotes(JSON.parse(v));
      const g = localStorage.getItem("demo_graduated");
      if (g) setGraduated(JSON.parse(g));
    } catch {}
  }, []);

  // Indice de carpetas de fecha · se carga al signar y se usa para construir
  // los paths de fetch de snapshots/holders del folder mas reciente.
  // Layout: snapshots/<YYYY_MM_DD>/<slug>.json (sin sufijo, sin LATEST suelto).
  const [snapIdx, setSnapIdx] = useState<{ snapshots: string | null; holders: string | null } | null>(null);

  useEffect(() => {
    if (!signed) return;
    Promise.all([
      fetch("/demo-data/tokens.json").then(r => r.json()),
      fetch("/api/snap_index").then(r => r.json()),
    ]).then(([d, idx]: [TokenMeta[], any]) => {
      setTokens(d);
      if (d.length > 0) setActiveSlug(d[0].slug);
      setSnapIdx({
        snapshots: idx?.snapshots?.latest ?? null,
        holders:   idx?.holders?.latest ?? null,
      });
    }).catch(() => {});
  }, [signed]);

  useEffect(() => {
    if (!activeSlug || !snapIdx) return;
    if (!snapIdx.snapshots || !snapIdx.holders) {
      // sin folder de fecha disponible — UI muestra empty
      setSnap(null); setHolders([]);
      return;
    }
    setLoadingDetail(true);
    Promise.all([
      fetch(`/demo-data/snapshots/${snapIdx.snapshots}/${activeSlug}.json`).then(r => r.json()),
      fetch(`/demo-data/holders/${snapIdx.holders}/${activeSlug}.json`).then(r => r.json()),
    ]).then(([s, h]) => {
      setSnap(s);
      setHolders((h as Holder[]).slice(0, 100));
    }).catch(() => {}).finally(() => setLoadingDetail(false));
  }, [activeSlug, snapIdx]);

  const handleSign = async () => {
    if (!signMessage) return;
    setSigning(true); setSignErr(null);
    try {
      await signMessage(new TextEncoder().encode(SIGN_MSG));
      setSigned(true);
    } catch (e: any) { setSignErr(e?.message || "sign failed"); }
    finally { setSigning(false); }
  };

  const handleVote = async (slug: string) => {
    if (!signMessage || graduated.includes(slug)) return;
    setVoting(slug);
    try {
      await signMessage(new TextEncoder().encode(`satelldex-demo:vote:${slug}`));
      const next = (votes[slug] || 0) + 1;
      const nextVotes = { ...votes, [slug]: next };
      setVotes(nextVotes);
      localStorage.setItem("demo_votes", JSON.stringify(nextVotes));
      if (next >= VOTE_THRESHOLD) {
        const nextGrad = [...graduated, slug];
        setGraduated(nextGrad);
        localStorage.setItem("demo_graduated", JSON.stringify(nextGrad));
        setVoteToast(`🚀 ${slug.toUpperCase()} GRADUATED — Scanner activated!`);
        setTimeout(() => setVoteToast(null), 5000);
      } else {
        setVoteToast(`+1 vote · ${slug.toUpperCase()} ${next}/${VOTE_THRESHOLD}`);
        setTimeout(() => setVoteToast(null), 2200);
      }
    } catch {} finally { setVoting(null); }
  };

  // ────────── Sign gate (pre-firma) ──────────
  if (!signed) {
    return (
      <>
        <Navbar />
        <Hero connected={connected} onSign={handleSign} signing={signing} signErr={signErr} pubkey={publicKey?.toBase58()} />
      </>
    );
  }

  // ────────── Main view (post-firma) ──────────
  const activeToken = tokens.find(t => t.slug === activeSlug) || null;

  return (
    <>
      <Navbar pubkey={publicKey?.toBase58()} />
      <main style={{ minHeight: "calc(100vh - 56px)", padding: "24px 16px 60px", position: "relative" }}>
        <BgGrid />
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* eyebrow + title */}
          <div style={{ marginBottom: 26, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ display: "inline-block", width: 32, height: 1, background: "linear-gradient(90deg, transparent, #06b6d4)" }} />
              <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.3em", color: "#06b6d4", textTransform: "uppercase" }}>
                ◈ SOLANA HOLDER INTELLIGENCE
              </span>
            </div>
            <h1 style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "clamp(16px, 2.4vw, 28px)", fontWeight: 400, lineHeight: 1.4, margin: 0,
              background: "linear-gradient(90deg, #06b6d4 0%, #818cf8 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "0.02em",
            }}>
              Tracked Tokens
            </h1>
          </div>

          {/* link a la seccion global VIP (otra ruta, otro sign gate) */}
          <a href="/global" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(6,182,212,0.08))",
            border: "1px solid rgba(167,139,250,0.45)",
            borderRadius: 8, padding: "10px 16px", marginBottom: 18,
            color: "#a78bfa", textDecoration: "none",
            fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
          }}>
            <span style={{ fontSize: 14 }}>◉</span> GLOBAL VIP DASHBOARD →
          </a>

          {/* community gauge */}
          <CommunityGauge
            votes={votes}
            graduated={graduated}
            voting={voting}
            onVote={handleVote}
          />

          {/* token chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
            {tokens.map(t => {
              const active = t.slug === activeSlug;
              return (
                <button
                  key={t.slug}
                  onClick={() => setActiveSlug(t.slug)}
                  style={{
                    background: active ? "linear-gradient(135deg, rgba(6,182,212,0.18), rgba(129,140,248,0.12))" : "#0d1117",
                    border: active ? "1px solid #06b6d4" : "1px solid #1e293b",
                    borderRadius: 6, padding: "9px 18px",
                    color: active ? "#22d3ee" : "#94a3b8",
                    fontWeight: 700, fontSize: 12, letterSpacing: "0.06em",
                    cursor: "pointer", textTransform: "uppercase",
                    fontFamily: "monospace",
                  }}
                >
                  {t.symbol}
                </button>
              );
            })}
            {graduated.map(slug => {
              const t = PENDING_TOKENS.find(p => p.slug === slug);
              if (!t) return null;
              return (
                <span
                  key={`grad-${slug}`}
                  style={{
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.5)",
                    borderRadius: 6, padding: "9px 14px",
                    color: "#4ade80",
                    fontWeight: 700, fontSize: 11, letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontFamily: "monospace",
                  }}
                  title="graduated — scanner started"
                >
                  ✓ {t.symbol} <span style={{ fontSize: 9, opacity: 0.7 }}>(scanning)</span>
                </span>
              );
            })}
          </div>

          {/* detalle */}
          {loadingDetail && <p style={{ color: "#475569" }}>loading…</p>}

          {!loadingDetail && activeToken && snap && (
            <>
              <TokenHeader token={activeToken} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 14 }}>
                <DistCard title="Liquidity Distribution" rows={LIQ_BRACKETS.map(b => ({
                  label: b.label, color: b.color,
                  value: parseFloat(String(snap[`liq_${b.key}`] ?? 0)),
                  isPercent: true,
                }))} />
                <DistCard title="Account Distribution" rows={ACC_BRACKETS.map(b => ({
                  label: b.label, color: b.color, tier: b.tier, icon: b.icon,
                  value: parseInt(String(snap[`acc_${b.key}`] ?? 0)),
                  isPercent: false,
                }))} />
                <DistCard title="Tokens Distribution" rows={TOKEN_BRACKETS.map(b => ({
                  label: b.label, color: b.color,
                  value: parseInt(String(snap[`tok_${b.key}`] ?? 0)),
                  isPercent: false,
                }))} />
              </div>

              <HoldersTable holders={holders} symbol={activeToken.symbol} />
            </>
          )}
        </div>
      </main>

      {voteToast && (
        <div style={{
          position: "fixed", left: "50%", bottom: 32, transform: "translateX(-50%)",
          background: "#0d1117", color: "#a78bfa",
          border: "1px solid rgba(167,139,250,0.5)", borderRadius: 8,
          padding: "10px 18px", fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          fontFamily: "monospace",
        }}>
          {voteToast}
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────

function Navbar({ pubkey }: { pubkey?: string }) {
  // lista de admins file-based, source of truth en public/admins.json (root)
  const [adminPubkeys, setAdminPubkeys] = useState<string[]>([]);
  useEffect(() => {
    fetch("/admins.json")
      .then(r => r.json())
      .then((d: { admins: { pubkey: string }[] }) => {
        setAdminPubkeys((d.admins || []).map(a => a.pubkey));
      })
      .catch(() => {});
  }, []);
  const isAdmin = !!pubkey && adminPubkeys.includes(pubkey);

  return (
    <nav style={{
      height: 56,
      background: "#000",
      borderBottom: "1px solid rgba(6,182,212,0.18)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 18px",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#06b6d4", fontSize: 18 }}>◈</span>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, letterSpacing: "0.18em", color: "#fff" }}>
          SATELLDEX
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#06b6d4", padding: "2px 7px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.4)", borderRadius: 3, letterSpacing: "0.15em" }}>
          DEMO
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isAdmin && (
          <span style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 8,
            color: "#fbbf24", padding: "3px 8px",
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.5)",
            borderRadius: 3, letterSpacing: "0.18em",
          }}>
            ADMIN
          </span>
        )}
        {pubkey && (
          <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
            {pubkey.slice(0, 6)}…{pubkey.slice(-6)}
          </span>
        )}
        <WalletMultiButton />
      </div>
    </nav>
  );
}

function BgGrid() {
  return (
    <>
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage:
          "linear-gradient(rgba(6,182,212,0.025) 1px, transparent 1px)," +
          "linear-gradient(90deg, rgba(6,182,212,0.025) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      <div aria-hidden style={{
        position: "fixed", top: 0, left: 0, width: "60vw", height: "60vh",
        pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle at 0% 0%, rgba(6,182,212,0.08), transparent 60%)",
      }} />
      <div aria-hidden style={{
        position: "fixed", bottom: 0, right: 0, width: "60vw", height: "60vh",
        pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle at 100% 100%, rgba(167,139,250,0.06), transparent 60%)",
      }} />
    </>
  );
}

function Hero({ connected, onSign, signing, signErr, pubkey }: {
  connected: boolean; onSign: () => void; signing: boolean; signErr: string | null; pubkey?: string;
}) {
  return (
    <main style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <BgGrid />
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 480,
        background: "linear-gradient(160deg, rgba(6,182,212,0.08) 0%, rgba(129,140,248,0.04) 100%)",
        border: "1px solid rgba(6,182,212,0.45)",
        borderRadius: 14, padding: "36px 30px",
        boxShadow: "0 0 32px rgba(6,182,212,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ display: "inline-block", width: 24, height: 1, background: "linear-gradient(90deg, transparent, #06b6d4)" }} />
          <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.3em", color: "#06b6d4", textTransform: "uppercase" }}>
            ◈ SOLANA INTELLIGENCE
          </span>
        </div>
        <h1 style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 400, lineHeight: 1.35,
          margin: 0, marginBottom: 8,
          background: "linear-gradient(90deg, #06b6d4 0%, #818cf8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: "0.02em",
        }}>
          Holder Intel
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24, fontFamily: "monospace" }}>
          On-chain analytics · concept proof
        </p>

        {!connected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
            <p style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>
              Connect a Solana wallet to view tracked tokens.
            </p>
            <WalletMultiButton />
          </div>
        )}

        {connected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>
              Sign <code style={{ color: "#22d3ee" }}>{SIGN_MSG}</code> to authorize.
            </p>
            <button
              onClick={onSign}
              disabled={signing}
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #818cf8 100%)",
                border: "none", color: "#0a0e1a",
                padding: "14px 22px", fontFamily: "'Press Start 2P', monospace",
                fontSize: 11, letterSpacing: "0.1em", borderRadius: 6, cursor: "pointer",
              }}
            >
              {signing ? "signing…" : "↗ SIGN & VIEW TOKENS"}
            </button>
            {signErr && <p style={{ color: "#f87171", fontSize: 12 }}>{signErr}</p>}
            <p style={{ color: "#475569", fontSize: 11, fontFamily: "monospace" }}>
              wallet: <span style={{ color: "#06b6d4" }}>{pubkey?.slice(0, 6)}…{pubkey?.slice(-6)}</span>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function CommunityGauge({ votes, graduated, voting, onVote }: {
  votes: Record<string, number>;
  graduated: string[];
  voting: string | null;
  onVote: (slug: string) => void;
}) {
  return (
    <div style={{
      background: "linear-gradient(160deg, rgba(167,139,250,0.06) 0%, rgba(6,182,212,0.04) 100%)",
      border: "1px solid rgba(167,139,250,0.4)",
      borderRadius: 12, padding: 18, marginBottom: 22,
      boxShadow: "0 0 22px rgba(167,139,250,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#a78bfa", letterSpacing: "0.2em" }}>
            ◉ COMMUNITY GAUGE
          </span>
        </div>
        <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}>
          sign 10 votes → token graduates → scanner starts
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {PENDING_TOKENS.map(p => {
          const cur = votes[p.slug] || 0;
          const isGrad = graduated.includes(p.slug);
          const pct = Math.min(100, (cur / VOTE_THRESHOLD) * 100);
          const isVoting = voting === p.slug;
          return (
            <div key={p.slug} style={{
              background: "#0a0e1a",
              border: isGrad ? "1px solid rgba(74,222,128,0.5)" : "1px solid #1e293b",
              borderRadius: 8, padding: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div>
                  <p style={{ color: isGrad ? "#4ade80" : "#22d3ee", fontWeight: 700, fontSize: 13, margin: 0, fontFamily: "monospace" }}>
                    {p.symbol}
                  </p>
                  <p style={{ color: "#64748b", fontSize: 10, margin: "2px 0 0", fontFamily: "monospace" }}>{p.name}</p>
                </div>
                <span style={{ color: isGrad ? "#4ade80" : "#a78bfa", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
                  {cur}/{VOTE_THRESHOLD}
                </span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  background: isGrad ? "#4ade80" : "linear-gradient(90deg, #a78bfa, #06b6d4)",
                  transition: "width 0.4s",
                }} />
              </div>
              {isGrad ? (
                <p style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, textAlign: "center", margin: 0, fontFamily: "monospace" }}>
                  ✓ GRADUATED · scanner active
                </p>
              ) : (
                <button
                  onClick={() => onVote(p.slug)}
                  disabled={isVoting}
                  style={{
                    width: "100%",
                    background: isVoting ? "#1e293b" : "transparent",
                    border: "1px solid rgba(167,139,250,0.45)",
                    color: "#a78bfa",
                    padding: "7px 10px",
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                    borderRadius: 4, cursor: isVoting ? "wait" : "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  {isVoting ? "signing…" : "↗ SIGN VOTE"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TokenHeader({ token }: { token: TokenMeta }) {
  return (
    <div style={{
      background: "var(--panel)",
      border: "1px solid var(--border)",
      borderRadius: 12, padding: 18, marginBottom: 14,
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14,
    }}>
      <KV k="Token" v={token.symbol} accent />
      <KV k="Name"  v={token.name} />
      <KV k="Price" v={`$${token.price.toFixed(4)}`} />
      <KV k="FDV"   v={fmtUsd(token.fdv)} />
      <KV k="Holders" v={token.holders.toLocaleString()} />
    </div>
  );
}

function HoldersTable({ holders, symbol }: { holders: Holder[]; symbol: string }) {
  return (
    <div style={{
      background: "var(--panel)",
      border: "1px solid var(--border)",
      borderRadius: 12, padding: 14,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>
          Top {holders.length} Holders
        </h2>
        <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{symbol}</span>
      </div>
      {holders.length === 0 && <p style={{ color: "#475569", fontSize: 12 }}>no holders</p>}
      {holders.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <th style={th}>#</th>
                <th style={th}>Address</th>
                <th style={{ ...th, textAlign: "right" }}>Amount</th>
                <th style={{ ...th, textAlign: "right" }}>USD</th>
              </tr>
            </thead>
            <tbody>
              {holders.map((h, i) => (
                <tr key={h.address} style={{ borderBottom: "1px solid #1e293b22" }}>
                  <td style={{ ...td, color: "#94a3b8" }}>{i + 1}</td>
                  <td style={{ ...td, color: "#22d3ee", fontFamily: "monospace" }}>{trunc(h.address)}</td>
                  <td style={{ ...td, textAlign: "right", color: "#e2e8f0" }}>{h.amount.toLocaleString()}</td>
                  <td style={{ ...td, textAlign: "right", color: "#4ade80", fontWeight: 700 }}>${fmtUsd(h.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KV({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.08em", margin: 0, fontFamily: "monospace" }}>{k}</p>
      <p style={{ fontSize: 16, color: accent ? "#22d3ee" : "#fff", fontWeight: 700, margin: "2px 0 0" }}>{v}</p>
    </div>
  );
}

function DistCard({ title, rows }: { title: string; rows: { label: string; color: string; value: number; isPercent: boolean; tier?: string; icon?: string }[] }) {
  const max = Math.max(...rows.map(r => r.value)) || 1;
  // si alguna row tiene tier/icon (ej. Account Distribution con etiquetas marinas),
  // la columna izquierda se ensancha para acomodar el icono + tier + label.
  const hasTier = rows.some(r => r.tier);
  const leftCol = hasTier ? "150px" : "84px";
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r, i) => {
          const w = (r.value / max) * 100;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: `${leftCol} 1fr 70px`, gap: 8, alignItems: "center" }}>
              <span style={{ color: r.color, fontSize: 11, fontWeight: 700, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
                {r.icon && <span style={{ fontSize: 14 }}>{r.icon}</span>}
                {r.tier && <span style={{ minWidth: 56 }}>{r.tier}</span>}
                <span style={{ color: "#94a3b8", fontWeight: 400 }}>{r.label}</span>
              </span>
              <div style={{ height: 14, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(0.5, w)}%`, height: "100%", background: r.color, opacity: 0.85 }} />
              </div>
              <span style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700, textAlign: "right", fontFamily: "monospace" }}>
                {r.isPercent ? `${r.value.toFixed(1)}%` : r.value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "8px 10px",
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 8, color: "#64748b", letterSpacing: "0.12em",
};
const td: React.CSSProperties = { padding: "8px 10px", whiteSpace: "nowrap" };

function trunc(s: string) {
  if (!s) return "—";
  if (s.length <= 13) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}
function fmtUsd(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(2)}k`;
  return n.toFixed(2);
}
