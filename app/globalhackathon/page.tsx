"use client";

// /globalhackathon — vista global VIP filtrada a la categoria "memes" para
// jueces del Solana Frontier Hackathon 2026. Sign gate aislado (24h), sin
// tocar el sistema de auth principal. Carpeta removible cuando termine el
// hackathon.

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Sdkrout_back } from "@/app/lib/demoSdk";
import Navbarx_home from "@/app/layout/navbarhome";
import HackathonSignGate from "@/app/hackathonview/HackathonSignGate";
import Sec_yestmulti_liqclusters_barchart_h from "./sec_yestmul_liqclust_h";
import Sec_yestmulti_nwallets_barchart_h    from "./sec_yestmul_nwalls_h";
import Sec_yestmulti_nwalletspercent_barchart_h from "./sec_yestmul_nwallsper_h";
import Sec_nwallsclust_h                    from "./sec_token_nwallsclust_h";

const MEMES_CATEGORY_NAME = "memes";

const LIQ_METRICS = [
  "percent_bigpool", "percent_top1_10", "percent_top11_20",
  "percent_top21_50", "percent_top51_100", "percent_others",
];
const NWALLS_METRICS = [
  "nholders_full", "nholders_over100", "nholders_over50000",
  "nholders_10000to50000", "nholders_5000to10000",
  "nholders_1000to5000", "nholders_500to1000", "nholders_100to500", "nholders_under100",
];
const NWALLS_PERC_METRICS = [
  "percent_nholders_over50000", "percent_nholders_10000to50000",
  "percent_nholders_5000to10000", "percent_nholders_1000to5000",
  "percent_nholders_500to1000", "percent_nholders_100to500", "percent_nholders_under100",
];

// Mapea un row del history al shape que los componentes copiados esperan
function buildTimestamp(r: any) {
  return {
    runts: parseInt(r.runts || "0"),
    pages: r.pages ?? 0,
    liquiditypercent: {
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
      percent_nholders_over50000:    r.perc_nholders_over50000,
      percent_nholders_10000to50000: r.perc_nholders_10000to50000,
      percent_nholders_5000to10000:  r.perc_nholders_5000to10000,
      percent_nholders_1000to5000:   r.perc_nholders_1000to5000,
      percent_nholders_500to1000:    r.perc_nholders_500to1000,
      percent_nholders_100to500:     r.perc_nholders_100to500,
      percent_nholders_under100:     r.perc_nholders_under100,
    },
  };
}

interface Category { id: number; name: string; color: string; tokens: string[]; }

type HudKey = "snapshot" | "clustbytoken";

export default function GlobalHackathonPage() {
  const sdk = new Sdkrout_back();
  const { publicKey, signMessage } = useWallet();

  const [loading, setLoading] = useState(true);
  const [memeTokens, setMemeTokens] = useState<string[]>([]);
  const [memeCategory, setMemeCategory] = useState<Category | null>(null);
  const [fullGlobal, setFullGlobal] = useState<any[]>([]);
  const [snapFolders, setSnapFolders] = useState<string[]>([]);
  // activeHud parte en null: el juez debe firmar para abrir cualquier tab
  const [activeHud, setActiveHud]   = useState<HudKey | null>(null);
  const [signedHud, setSignedHud]   = useState<HudKey | null>(null);
  const [signingHud, setSigningHud] = useState<HudKey | null>(null);
  const [signErr, setSignErr]       = useState<string | null>(null);

  // Pide firma cada vez que se cambia de tab. Sin persistencia: volver al tab
  // anterior exige re-firmar. Reporta al backend con view="hackathon_global"
  // y token=<hud key> (snapshot / clustbytoken) para auditoria por-tab.
  const handleHudClick = async (hud: HudKey) => {
    setSignErr(null);
    if (signedHud === hud && activeHud === hud) return;
    if (!publicKey || !signMessage) {
      setSignErr("Wallet not connected");
      return;
    }
    setSigningHud(hud);
    try {
      const ts = Date.now();
      const msg = `satelldex-hackathon:judge-token:${hud}:${ts}`;
      const sigBytes = await signMessage(new TextEncoder().encode(msg));
      let binary = "";
      for (let i = 0; i < sigBytes.length; i++) binary += String.fromCharCode(sigBytes[i]);
      const sigB64 = btoa(binary);

      try {
        await fetch("/api/hackathon_sign", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            pubkey:        publicKey.toBase58(),
            signature_b64: sigB64,
            message:       msg,
            view:          "hackathon_global",
            token:         hud,
          }),
        });
      } catch {}

      setSignedHud(hud);
      setActiveHud(hud);
    } catch (e: any) {
      setSignErr(e?.message ?? "signature rejected");
    } finally {
      setSigningHud(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // /api/snap_index expuesto en la UI como lista clickeable arriba
        // de los HUD tabs — el juez ve cuantos snapshots hay y sus fechas.
        const [catRes, histRes, idxRes] = await Promise.all([
          sdk.fetch_category_list(),
          sdk.fetch_globalrun_history(),
          fetch("/api/snap_index", { cache: "no-store" })
            .then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (idxRes?.snapshots?.folders) setSnapFolders(idxRes.snapshots.folders);

        if (!catRes.ok) return;
        const memes = catRes.categories.find(c => c.name?.toLowerCase() === MEMES_CATEGORY_NAME);
        if (!memes) return;
        setMemeCategory(memes);
        setMemeTokens(memes.tokens);

        if (!histRes.ok) return;
        const filtered = histRes.tokens
          .filter((t: any) => memes.tokens.includes(t.token_name))
          .map((t: any) => ({
            token: t.token_name,
            data: {
              walletblocks: [{
                timestamps: t.timestamps.map((r: any) => buildTimestamp(r)),
              }],
            },
          }));
        setFullGlobal(filtered);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  // Formatea YYYY_MM_DD__HH_MM (UTC en disco) a hora local del browser.
  // Si el folder no tiene sufijo de hora, muestra solo la fecha.
  const fmtFolder = (f: string): string => {
    const m = f.match(/^(\d{4})_(\d{2})_(\d{2})(?:__(\d{2})_(\d{2}))?$/);
    if (!m) return f;
    const [, y, mo, d, hh, mn] = m;
    const hasTime = !!(hh && mn);
    const utc = new Date(Date.UTC(
      parseInt(y), parseInt(mo) - 1, parseInt(d),
      hasTime ? parseInt(hh) : 0,
      hasTime ? parseInt(mn) : 0,
    ));
    const opts: Intl.DateTimeFormatOptions = hasTime
      ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short" };
    return utc.toLocaleString(undefined, opts);
  };

  // Adapta el shape al que esperan los componentes copiados
  const fullGlobalForBarcharts = fullGlobal;

  return (
    <HackathonSignGate title="Global Hackathon — Memes Overview" view="hackathon_global">
      <div style={{ background: "#0a0e1a", minHeight: "100vh" }}>
        <Navbarx_home />

        <div className="p-4 md:p-6 max-w-screen-2xl mx-auto" style={{ paddingBottom: 160, paddingTop: 80 }}>
          {/* banner hackathon */}
          <div style={{
            background: "linear-gradient(90deg, rgba(167,139,250,0.10) 0%, rgba(6,182,212,0.10) 100%)",
            border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
            borderRadius: 8, padding: "10px 16px", marginBottom: 18,
            fontFamily: "monospace", fontSize: 11, color: "#a78bfa",
            letterSpacing: "0.06em", textAlign: "center",
          }}>
            ◈ HACKATHON JUDGE VIEW · GLOBAL VIP — MEMES CROSS-TOKEN ◈
          </div>

          <h1 style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "clamp(16px, 2.4vw, 28px)", fontWeight: 400, lineHeight: 1.4, margin: 0,
            background: "linear-gradient(90deg, #a78bfa 0%, #06b6d4 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "0.02em", marginBottom: 8,
          }}>
            Memes Multi-Token Overview
          </h1>
          <p style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 11, marginBottom: 22 }}>
            {memeTokens.length} tokens · category &quot;memes&quot;
          </p>

          {/* HUD de tokens memes — links a /hackathonview para detalle por-token */}
          {memeTokens.length > 0 && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, justifyContent: "center" }}>
                {memeTokens.map(tok => (
                  <a
                    key={tok}
                    href="/hackathonview"
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 9,
                      padding: "8px 14px",
                      letterSpacing: "0.08em",
                      background: "transparent",
                      color: "#94a3b8",
                      border: "1px solid #334155",
                      borderRadius: 4,
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    {tok.toUpperCase()}
                  </a>
                ))}
              </div>
              <p style={{ fontFamily: "monospace", fontSize: 10, color: "#64748b", textAlign: "center", marginBottom: 22 }}>
                tokens in this cross-view · click any to inspect individually in /hackathonview
              </p>
            </>
          )}

          {/* Panel visible de snapshots disponibles — listado read-only que
              confirma cuantos folders YYYY_MM_DD__HH_MM existen en disco.
              Los charts de abajo consumen TODOS estos snapshots ya. */}
          {snapFolders.length > 0 && (
            <div style={{
              background: "#0d1117", border: "1px solid #1e293b",
              borderRadius: 8, padding: "12px 16px", marginBottom: 18,
            }}>
              <p style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                color: "#06b6d4", letterSpacing: "0.10em", margin: "0 0 10px",
              }}>
                ◈ {snapFolders.length} SNAPSHOT{snapFolders.length === 1 ? "" : "S"} AVAILABLE
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {snapFolders.map((f, i) => {
                  const isLatest = i === snapFolders.length - 1;
                  return (
                    <span key={f} style={{
                      fontFamily: "monospace", fontSize: 10,
                      padding: "4px 10px", borderRadius: 4,
                      letterSpacing: "0.04em",
                      background: isLatest ? "rgba(6,182,212,0.12)" : "transparent",
                      border: `1px solid ${isLatest ? "#06b6d4" : "#334155"}`,
                      color: isLatest ? "#06b6d4" : "#94a3b8",
                    }}>
                      {fmtFolder(f)}{isLatest ? " · latest" : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* HUD tabs — cada tab requiere firma para verse */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, justifyContent: "center" }}>
            <HudBtn
              label={signingHud === "snapshot" ? "SIGNING…" : (signedHud === "snapshot" && activeHud === "snapshot" ? "✓ ◈ LAST SNAPSHOT" : "◈ LAST SNAPSHOT")}
              active={activeHud === "snapshot"}
              onClick={() => handleHudClick("snapshot")}
            />
            <HudBtn
              label={signingHud === "clustbytoken" ? "SIGNING…" : (signedHud === "clustbytoken" && activeHud === "clustbytoken" ? "✓ ▣ CLUSTERS BY TOKEN" : "▣ CLUSTERS BY TOKEN")}
              active={activeHud === "clustbytoken"}
              onClick={() => handleHudClick("clustbytoken")}
            />
          </div>
          <p style={{ fontFamily: "monospace", fontSize: 10, color: "#ffffff", fontWeight: 700, textAlign: "center", marginBottom: 22 }}>
            click a tab to sign and view · switching tabs requires a new signature each time
          </p>
          {signErr && <p style={{ fontFamily: "monospace", fontSize: 11, color: "#fca5a5", textAlign: "center", marginBottom: 12 }}>{signErr}</p>}

          {loading && <p style={{ color: "#475569" }}>loading…</p>}

          {!loading && fullGlobal.length === 0 && (
            <p style={{ color: "#fbbf24" }}>No memes tokens with history available.</p>
          )}

          {!loading && activeHud === "snapshot" && signedHud === "snapshot" && fullGlobal.length > 0 && memeCategory && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Sec_yestmulti_liqclusters_barchart_h
                fullGlobal={fullGlobalForBarcharts}
                categories={[memeCategory]}
                metrics={LIQ_METRICS}
                title="Liquidity Clusters % — Last Snapshot (Memes)"
                suffix="hkthn_liqclust"
              />
              <Sec_yestmulti_nwallets_barchart_h
                fullGlobal={fullGlobalForBarcharts}
                categories={[memeCategory]}
                metrics={NWALLS_METRICS}
                title="Holders by Accounts — Last Snapshot (Memes)"
                suffix="hkthn_nwalls"
              />
              <Sec_yestmulti_nwalletspercent_barchart_h
                fullGlobal={fullGlobalForBarcharts}
                categories={[memeCategory]}
                metrics={NWALLS_PERC_METRICS}
                title="Holders by % — Last Snapshot (Memes)"
                suffix="hkthn_nwallsperc"
              />
            </div>
          )}

          {!loading && activeHud === "clustbytoken" && signedHud === "clustbytoken" && fullGlobal.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14 }}>
              {fullGlobal.map(e => (
                <Sec_nwallsclust_h
                  key={`hkthn_clustbytoken_${e.token}`}
                  token={e.token}
                  globaldata={e.data}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </HackathonSignGate>
  );
}

function HudBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 9,
        padding: "10px 16px",
        letterSpacing: "0.08em",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#0a0e1a" : "#94a3b8",
        border: `1px solid ${active ? "var(--accent)" : "#334155"}`,
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
