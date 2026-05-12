"use client";

// Global VIP Section — vista multi-token con snapshot agregado.
// 2 tabs: TOKENS (listado por categoria) + LAST SNAPSHOT (bar charts
// comparativos entre tokens del snapshot actual).

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import Sec_yestmulti_liqclusters_barchart from "./sec_yestmul_liqclust";
import Sec_yestmulti_nwallets_barchart from "./sec_yestmul_nwalls";
import Sec_yestmulti_nwalletspercent_barchart from "./sec_yestmul_nwallsper";
import Sec_nwallsclust from "./sec_token_nwallsclust";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const SIGN_MSG_GLOBAL = "satelldex-demo:view-global";

// metricas que cada bar chart consume
const LIQ_METRICS = [
  "percent_bigpool", "percent_top1_10", "percent_top11_20",
  "percent_top21_50", "percent_top51_100", "percent_others"
];
const NWALLS_METRICS = [
  "nholders_full", "nholders_over100", "nholders_over50000",
  "nholders_10000to50000", "nholders_5000to10000",
  "nholders_1000to5000", "nholders_500to1000", "nholders_100to500", "nholders_under100"
];
const NWALLS_PERC_METRICS = [
  "perc_nholders_over50000", "perc_nholders_10000to50000",
  "perc_nholders_5000to10000", "perc_nholders_1000to5000",
  "perc_nholders_500to1000", "perc_nholders_100to500", "perc_nholders_under100"
];

// transforma un row plano (como sale del JSON) al shape anidado que los charts esperan
function buildTimestamp(r: any) {
  return {
    runts: parseInt(r.runts || "0"),
    pages: r.pages ?? 0,
    liquiditypercent: {
      percent_bigpool:  r.perc_bigpool,
      percent_top10:    r.perc_top10,
      percent_top20:    r.perc_top20,
      percent_top50:    r.perc_top50,
      percent_top100:   r.perc_top100,
      percent_over100:  r.perc_over100,
      percent_under100: r.perc_under100,
    },
    liquiditypercent_topscluster: {
      percent_bigpool:    r.perc_bigpool,
      percent_top1_10:    r.perc_top1_10,
      percent_top11_20:   r.perc_top11_20,
      percent_top21_50:   r.perc_top21_50,
      percent_top51_100:  r.perc_top51_100,
      percent_others:     r.perc_others,
    },
    walletblocks: {
      nholders_full:          r.nholders_full,
      nholders_over100:       r.nholders_over100,
      nholders_under100:      r.nholders_under100,
      nholders_over50000:     r.nholders_over50000,
      nholders_10000to50000:  r.nholders_10000to50000,
      nholders_5000to10000:   r.nholders_5000to10000,
      nholders_1000to5000:    r.nholders_1000to5000,
      nholders_500to1000:     r.nholders_500to1000,
      nholders_100to500:      r.nholders_100to500,
    },
    walletblocks_percents: {
      perc_nholders_over50000:    r.perc_nholders_over50000,
      perc_nholders_10000to50000: r.perc_nholders_10000to50000,
      perc_nholders_5000to10000:  r.perc_nholders_5000to10000,
      perc_nholders_1000to5000:   r.perc_nholders_1000to5000,
      perc_nholders_500to1000:    r.perc_nholders_500to1000,
      perc_nholders_100to500:     r.perc_nholders_100to500,
      perc_nholders_under100:     r.perc_nholders_under100,
    },
  };
}

interface Category { id: number; name: string; color: string; tokens: string[]; }

export default function GlobalPage() {
  const { connected, signMessage } = useWallet();

  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signErr, setSignErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [fullGlobal, setFullGlobal] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeHud, setActiveHud] = useState<"tokens" | "snapshot" | "clustbytoken">("snapshot");

  // sin session ni cookie: cada refresh requiere re-firmar.

  // carga global_history + categories una vez firmado
  useEffect(() => {
    if (!signed) return;
    Promise.all([
      fetch("/demo-data/global/global_history.json").then(r => r.json()),
      fetch("/demo-data/global/categories.json").then(r => r.json()),
    ]).then(([histRes, catRes]) => {
      // empaqueta cada token al formato que los charts esperan
      const pack = histRes.tokens.map((t: any) => ({
        token: t.token_name,
        data: {
          walletblocks: [{
            timestamps: t.timestamps.map((r: any) => buildTimestamp(r)),
          }],
        },
      }));
      setFullGlobal(pack);
      setCategories(catRes.categories || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [signed]);

  const handleSign = async () => {
    if (!signMessage) return;
    setSigning(true); setSignErr(null);
    try {
      await signMessage(new TextEncoder().encode(SIGN_MSG_GLOBAL));
      setSigned(true);
    } catch (e: any) {
      setSignErr(e?.message || "sign failed");
    } finally {
      setSigning(false);
    }
  };

  // ── sign gate (pre-firma) ──
  if (!signed) {
    return (
      <>
        <Navbar />
        <SignGate
          connected={connected}
          onSign={handleSign}
          signing={signing}
          signErr={signErr}
        />
      </>
    );
  }

  // mapa de categoria por token
  const tokenCatMap: Record<string, { id: number; name: string; color: string }> = {};
  for (const cat of categories) {
    for (const t of cat.tokens) {
      tokenCatMap[t] = { id: cat.id, name: cat.name, color: cat.color };
    }
  }
  const uncategorized = fullGlobal.filter(e => !tokenCatMap[e.token]);

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 56px)", padding: "24px 16px 60px", position: "relative" }}>
        <BgGrid />
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <header style={{ marginBottom: 26, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ display: "inline-block", width: 32, height: 1, background: "linear-gradient(90deg, transparent, #a78bfa)" }} />
              <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.3em", color: "#a78bfa", textTransform: "uppercase" }}>
                ◉ GLOBAL VIP DASHBOARD
              </span>
            </div>
            <h1 style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "clamp(16px, 2.4vw, 28px)", fontWeight: 400, lineHeight: 1.4, margin: 0,
              background: "linear-gradient(90deg, #a78bfa 0%, #06b6d4 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "0.02em",
            }}>
              Multi-Token Overview
            </h1>
          </header>

          {/* HUD tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            <HudBtn label="◎ TOKENS"             active={activeHud === "tokens"}        onClick={() => setActiveHud("tokens")} />
            <HudBtn label="◈ LAST SNAPSHOT"      active={activeHud === "snapshot"}      onClick={() => setActiveHud("snapshot")} />
            <HudBtn label="▣ CLUSTERS BY TOKEN"  active={activeHud === "clustbytoken"}  onClick={() => setActiveHud("clustbytoken")} />
          </div>

          {loading && <p style={{ color: "#475569" }}>loading…</p>}

          {!loading && activeHud === "tokens" && (
            <TokensTab fullGlobal={fullGlobal} tokenCatMap={tokenCatMap} uncategorized={uncategorized} categories={categories} />
          )}

          {!loading && activeHud === "clustbytoken" && fullGlobal.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14 }}>
              {fullGlobal.map((e) => (
                <Sec_nwallsclust
                  key={`clustbytoken_${e.token}`}
                  token={e.token}
                  globaldata={e.data}
                  suffix="cbt"
                />
              ))}
            </div>
          )}

          {!loading && activeHud === "snapshot" && fullGlobal.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Sec_yestmulti_liqclusters_barchart
                fullGlobal={fullGlobal}
                categories={categories}
                metrics={LIQ_METRICS}
                title="Liquidity Clusters % — Last Snapshot"
                suffix="liqclust"
              />
              <Sec_yestmulti_nwallets_barchart
                fullGlobal={fullGlobal}
                categories={categories}
                metrics={NWALLS_METRICS}
                title="Wallets by USD bucket — counts"
                suffix="nwalls"
              />
              <Sec_yestmulti_nwalletspercent_barchart
                fullGlobal={fullGlobal}
                categories={categories}
                metrics={NWALLS_PERC_METRICS}
                title="Wallets by USD bucket — % share"
                suffix="nwallsperc"
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ───────── sub-components locales ─────────

function Navbar() {
  const { publicKey } = useWallet();
  const pubkey = publicKey?.toBase58();
  // lista de admins file-based (mismo source que el navbar del home)
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
      borderBottom: "1px solid rgba(167,139,250,0.18)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 18px",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#06b6d4", fontSize: 18 }}>◈</span>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, letterSpacing: "0.18em", color: "#fff" }}>
          SATELLDEX
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#a78bfa", padding: "2px 7px", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.4)", borderRadius: 3, letterSpacing: "0.15em" }}>
          GLOBAL · DEMO
        </span>
      </a>
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
          "linear-gradient(rgba(167,139,250,0.025) 1px, transparent 1px)," +
          "linear-gradient(90deg, rgba(167,139,250,0.025) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      <div aria-hidden style={{
        position: "fixed", top: 0, right: 0, width: "60vw", height: "60vh",
        pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle at 100% 0%, rgba(167,139,250,0.08), transparent 60%)",
      }} />
    </>
  );
}

function SignGate({ connected, onSign, signing, signErr }: {
  connected: boolean; onSign: () => void; signing: boolean; signErr: string | null;
}) {
  return (
    <main style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <BgGrid />
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 480,
        background: "linear-gradient(160deg, rgba(167,139,250,0.08) 0%, rgba(6,182,212,0.04) 100%)",
        border: "1px solid rgba(167,139,250,0.45)",
        borderRadius: 14, padding: "36px 30px",
        boxShadow: "0 0 32px rgba(167,139,250,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ display: "inline-block", width: 24, height: 1, background: "linear-gradient(90deg, transparent, #a78bfa)" }} />
          <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.3em", color: "#a78bfa", textTransform: "uppercase" }}>
            ◉ GLOBAL VIP ACCESS
          </span>
        </div>
        <h1 style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "clamp(18px, 2.6vw, 24px)", fontWeight: 400, lineHeight: 1.35,
          margin: 0, marginBottom: 8,
          background: "linear-gradient(90deg, #a78bfa 0%, #06b6d4 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Cross-Token Overview
        </h1>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 24, fontFamily: "monospace" }}>
          sign to compare every tracked token in one view
        </p>
        {!connected && <WalletMultiButton />}
        {connected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>
              Sign <code style={{ color: "#a78bfa" }}>{SIGN_MSG_GLOBAL}</code>
            </p>
            <button
              onClick={onSign}
              disabled={signing}
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)",
                border: "none", color: "#0a0e1a",
                padding: "14px 22px", fontFamily: "'Press Start 2P', monospace",
                fontSize: 11, letterSpacing: "0.1em", borderRadius: 6, cursor: "pointer",
              }}
            >
              {signing ? "signing…" : "↗ SIGN & ENTER GLOBAL"}
            </button>
            {signErr && <p style={{ color: "#f87171", fontSize: 12 }}>{signErr}</p>}
          </div>
        )}
      </div>
    </main>
  );
}

function HudBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "linear-gradient(135deg, rgba(167,139,250,0.18), rgba(6,182,212,0.12))" : "#0d1117",
        border: active ? "1px solid #a78bfa" : "1px solid #1e293b",
        borderRadius: 6, padding: "9px 18px",
        color: active ? "#a78bfa" : "#94a3b8",
        fontWeight: 700, fontSize: 11, letterSpacing: "0.08em",
        cursor: "pointer", textTransform: "uppercase",
        fontFamily: "monospace",
      }}
    >
      {label}
    </button>
  );
}

function TokensTab({ fullGlobal, tokenCatMap, uncategorized, categories }: {
  fullGlobal: any[];
  tokenCatMap: Record<string, { id: number; name: string; color: string }>;
  uncategorized: any[];
  categories: Category[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
      {fullGlobal.map(e => {
        const cat = tokenCatMap[e.token];
        const color = cat?.color ?? "#475569";
        const lastSnap = e.data.walletblocks[0].timestamps[0];
        return (
          <div key={e.token} style={{
            background: "#0d1117",
            border: `1px solid ${color}44`,
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0, fontFamily: "monospace", letterSpacing: "0.06em" }}>
                {e.token.toUpperCase()}
              </p>
              <span style={{ color, fontSize: 9, fontFamily: "monospace", letterSpacing: "0.1em" }}>
                {(cat?.name ?? "OTHERS").toUpperCase()}
              </span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: 11, margin: 0, fontFamily: "monospace" }}>
              {lastSnap?.walletblocks?.nholders_full?.toLocaleString() ?? "—"} holders
            </p>
            <p style={{ color: "#64748b", fontSize: 10, margin: "2px 0 0", fontFamily: "monospace" }}>
              bigpool: {lastSnap?.liquiditypercent?.percent_bigpool ?? 0}%
            </p>
          </div>
        );
      })}
    </div>
  );
}
