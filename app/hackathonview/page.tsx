"use client";

// /hackathonview — vista dedicada para jueces del Solana Frontier Hackathon 2026.
// Selector de tokens de la categoria "memes" + render de la vista VIP del token
// activo. Sign gate aislado: una firma vale 24h. NO afecta la arquitectura
// principal del sitio (esta carpeta es removible cuando el hackathon termine).

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Sdkrout_back } from "@/app/lib/demoSdk";
import Navbarx_home from "@/app/layout/navbarhome";
import HackathonSignGate from "./HackathonSignGate";
import TextData_hackathon from "./sec_datatext_hackathon";
import HoldersTable_hackathon from "./sec_holdertable_hackathon";

const MEMES_CATEGORY_NAME = "memes"; // case-insensitive match en /api/category_list

export default function HackathonView() {
  const sdk = new Sdkrout_back();
  const { publicKey, signMessage } = useWallet();

  const [memeTokens, setMemeTokens] = useState<string[]>([]);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(true);

  // Token actualmente firmado (uno solo). Cambiar de token requiere re-firmar.
  // No persiste en localStorage: cada cambio de panel exige nueva firma.
  const [signedToken, setSignedToken] = useState<string | null>(null);
  const [signing, setSigning] = useState<string | null>(null);
  const [signErr, setSignErr] = useState<string | null>(null);

  const [counters, setCounters]     = useState<any | null>(null);
  const [globaldata, setGlobaldata] = useState<any | null>(null);
  const [holders, setHolders]       = useState<any[]>([]);
  const [querytime, setQuerytime]   = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch de la categoria memes -> setea lista de tokens (sin auto-seleccionar)
  useEffect(() => {
    (async () => {
      try {
        const res = await sdk.fetch_category_list();
        if (!res.ok) return;
        const memes = res.categories.find((c: any) => c.name?.toLowerCase() === MEMES_CATEGORY_NAME);
        if (!memes || !memes.tokens || memes.tokens.length === 0) return;
        setMemeTokens(memes.tokens);
        // NO auto-seleccionamos un token: el juez debe firmar por cada uno
      } catch (err) { console.error(err); }
      finally { setLoadingTokens(false); }
    })();
  }, []);

  // Solo carga detalle si el token activo coincide con el firmado actual
  useEffect(() => {
    if (!activeToken) return;
    if (signedToken !== activeToken) return;
    loadDetail(activeToken);
  }, [activeToken, signedToken]);

  // Pide firma cada vez que el juez cambia de token. Sin persistencia: si
  // vuelve al mismo token despues de cambiar a otro, debe re-firmar.
  const handleTokenClick = async (token: string) => {
    setSignErr(null);
    if (signedToken === token && activeToken === token) return; // ya activo y firmado
    if (!publicKey || !signMessage) {
      setSignErr("Wallet not connected");
      return;
    }
    setSigning(token);
    // limpia data anterior antes de firmar para que la UI no muestre data del token previo
    setCounters(null); setGlobaldata(null); setHolders([]);
    try {
      const ts = Date.now();
      const msg = `satelldex-hackathon:judge-token:${token}:${ts}`;
      const sigBytes = await signMessage(new TextEncoder().encode(msg));
      let binary = "";
      for (let i = 0; i < sigBytes.length; i++) binary += String.fromCharCode(sigBytes[i]);
      const sigB64 = btoa(binary);

      // reporta al backend (silencioso si falla)
      try {
        await fetch("/api/hackathon_sign", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            pubkey:        publicKey.toBase58(),
            signature_b64: sigB64,
            message:       msg,
            view:          "hackathon_view",
            token:         token,
          }),
        });
      } catch {}

      setSignedToken(token);   // reemplaza la firma anterior (no se acumulan)
      setActiveToken(token);
    } catch (e: any) {
      setSignErr(e?.message ?? "signature rejected");
    } finally {
      setSigning(null);
    }
  };

  const loadDetail = async (token: string) => {
    setLoadingDetail(true);
    setCounters(null); setGlobaldata(null); setHolders([]);
    try {
      const t0 = Date.now();
      const [snapRes, histRes, holdersRes] = await Promise.all([
        sdk.fetch_snapshot_latest(token),
        sdk.fetch_globalrun_history(),
        sdk.fetch_snapshot_holders_top100(token),
      ]);
      setQuerytime(Date.now() - t0);

      if (snapRes.ok) setCounters(snapRes.data);

      // Arma globaldata desde el history del token activo (mismo shape que demovip)
      if (histRes.ok) {
        const found = histRes.tokens.find((t: any) => t.token_name === token);
        if (found) {
          setGlobaldata({
            walletblocks: [{
              timestamps: found.timestamps.map((r: any) => ({
                runts: parseInt(r.runts || "0"),
                liquiditypercent_topscluster: {
                  percent_bigpool:       r.perc_bigpool,
                  percent_top1_10:       r.perc_top1_10,
                  percent_top11_20:      r.perc_top11_20,
                  percent_top21_50:      r.perc_top21_50,
                  percent_top51_100:     r.perc_top51_100,
                  percent_others:        r.perc_others,
                  nholders_over50000:    r.nholders_over50000,
                  nholders_10000to50000: r.nholders_10000to50000,
                  nholders_5000to10000:  r.nholders_5000to10000,
                  nholders_1000to5000:   r.nholders_1000to5000,
                  nholders_500to1000:    r.nholders_500to1000,
                  nholders_100to500:     r.nholders_100to500,
                  nholders_under100:     r.nholders_under100,
                  nholders_over100:      r.nholders_over100,
                  nholders_full:         r.nholders_full,
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
              })),
            }],
          });
        }
      }

      if (holdersRes.ok) {
        const rows = holdersRes.data.map((r: any, idx: number) => ({
          idx: idx + 1,
          owner: r.owner,
          amount: Number(String(r.amount).replace(/,/g, "")),
          percentage_of_total_supply: Number(r.percentage_of_total_supply),
          value_today: Number(String(r.value_today).replace(/,/g, "")),
          has_mainpool: r.has_mainpool,
          lookas_mainpool: r.lookas_mainpool,
        }));
        setHolders(rows);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingDetail(false); }
  };

  return (
    <HackathonSignGate title="Hackathon View — Memes VIP" view="hackathon_view">
      <div style={{ background: "#0a0e1a", minHeight: "100vh" }}>
        <Navbarx_home />

        <div className="mt-5 p-4 md:p-6 max-w-screen-2xl mx-auto" style={{ paddingBottom: 160, paddingTop: 140 }}>
          {/* CTA grande hacia /globalhackathon — estilo gradiente cyan->indigo
              equivalente al boton VIP del home (comp_tokenselector VipCard) */}
          <a
            href="/globalhackathon"
            style={{
              display: "flex",
              alignItems: "stretch",
              marginBottom: 18,
              background: "linear-gradient(135deg, #06b6d4 0%, #818cf8 100%)",
              border: "none",
              borderRadius: 6,
              textDecoration: "none",
              boxShadow: "0 0 20px rgba(6,182,212,0.3)",
              overflow: "hidden",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 0 32px rgba(6,182,212,0.5)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(6,182,212,0.3)";
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
                GLOBAL
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
                Cross-token memes overview — go to /globalhackathon →
              </span>
            </div>
          </a>

          {/* banner hackathon */}
          <div style={{
            background: "linear-gradient(90deg, rgba(167,139,250,0.10) 0%, rgba(6,182,212,0.10) 100%)",
            border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
            borderRadius: 8, padding: "10px 16px", marginBottom: 18,
            fontFamily: "monospace", fontSize: 11, color: "#a78bfa",
            letterSpacing: "0.06em", textAlign: "center",
          }}>
            ◈ HACKATHON JUDGE VIEW · MEMES SECTION VIP ACCESS ◈
          </div>

          {/* selector de tokens memes */}
          {loadingTokens && <p style={{ color: "#475569" }}>loading tokens…</p>}
          {!loadingTokens && memeTokens.length === 0 && (
            <p style={{ color: "#fbbf24" }}>No tokens in &quot;memes&quot; category.</p>
          )}
          {!loadingTokens && memeTokens.length > 0 && (
            <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, justifyContent: "center" }}>
              {memeTokens.map(tok => {
                const active   = tok === activeToken;
                // Solo se considera "firmado" si coincide con el unico token firmado actual.
                const isSigned  = signedToken === tok && activeToken === tok;
                const isSigning = signing === tok;
                return (
                  <button
                    key={tok}
                    onClick={() => handleTokenClick(tok)}
                    disabled={isSigning}
                    title={isSigned ? "Signed — click to view" : "Click to sign and view"}
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 9,
                      padding: "8px 14px",
                      letterSpacing: "0.08em",
                      background: active ? "var(--accent)" : "transparent",
                      color: active ? "#0a0e1a" : (isSigned ? "#86efac" : "#94a3b8"),
                      border: `1px solid ${active ? "var(--accent)" : (isSigned ? "#22c55e44" : "#334155")}`,
                      borderRadius: 4,
                      cursor: isSigning ? "wait" : "pointer",
                      opacity: isSigning ? 0.5 : 1,
                    }}
                  >
                    {isSigning ? "SIGNING…" : (isSigned ? `✓ ${tok.toUpperCase()}` : tok.toUpperCase())}
                  </button>
                );
              })}
            </div>
            <p style={{ fontFamily: "monospace", fontSize: 10, color: "#ffffff", fontWeight: 700, textAlign: "center", marginBottom: 18 }}>
              click a token to sign and view · switching tokens requires a new signature each time
            </p>
            {signErr && <p style={{ fontFamily: "monospace", fontSize: 11, color: "#fca5a5", marginBottom: 12 }}>{signErr}</p>}
            </>
          )}

          {/* título del token activo */}
          {activeToken && (
            <div className="mb-2">
              <h1 style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "12px", color: "#fff",
                letterSpacing: "0.05em",
                textShadow: "0 0 8px rgba(6,182,212,0.4)",
              }}>
                {activeToken.toUpperCase()} <span style={{ color: "#06b6d4" }}>Token Dashboard</span>
                {loadingDetail && <span className="text-xs text-yellow-400 animate-pulse ml-3">loading…</span>}
              </h1>

              {counters?.ca && (
                <a
                  href={`https://solscan.io/token/${counters.ca}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-0 rounded-lg overflow-hidden text-xs font-mono no-underline"
                  style={{ border: "1px solid #164e63" }}
                >
                  <span className="px-3 py-1.5 font-bold uppercase tracking-widest text-black" style={{ background: "#06b6d4", fontSize: "0.65rem" }}>CA</span>
                  <span className="px-3 py-1.5 tracking-wide" style={{ background: "#0d1b2a", color: "#94a3b8" }}>
                    {counters.ca.slice(0, 6)}...{counters.ca.slice(-6)}
                  </span>
                  <span className="px-2 py-1.5 font-semibold" style={{ background: "#0c3044", color: "#38bdf8" }}>↗</span>
                </a>
              )}

              {counters && (
                <p className="text-xs text-gray-500 mt-1">
                  Snapshot: <span className="text-gray-400">{counters.when}</span>
                  &nbsp;·&nbsp;ts: <span className="text-gray-400">{counters.runts}</span>
                </p>
              )}
            </div>
          )}

          {/* cards de datos VIP completas */}
          {counters && <TextData_hackathon data={counters} globaldata={globaldata} />}

          {/* tabla holders top 100 */}
          {activeToken && (
            <div className="mt-6 rounded-xl p-4 md:p-5" style={{ background: "#0f1623", border: "1px solid #164e63" }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "11px", color: "#fff", letterSpacing: "0.05em",
                }}>Holders</h2>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Query:</span>
                  {(["top100", "vip", "all"] as const).map((mode) => {
                    const label: Record<typeof mode, string> = { top100: "Top 100", vip: "+$100", all: "All" };
                    const active = mode === "top100";  // solo Top 100 esta habilitado en hackathon view
                    return (
                      <button
                        key={mode}
                        disabled
                        className="px-3 py-1 rounded text-sm font-semibold"
                        style={{
                          background: active ? "#0c3044" : "#1e293b",
                          color:      active ? "#38bdf8" : "#334155",
                          border:     active ? "1px solid #38bdf8" : "1px solid transparent",
                          cursor: "not-allowed",
                          opacity: active ? 1 : 0.5,
                        }}
                      >
                        {label[mode]}
                      </button>
                    );
                  })}
                  <span style={{
                    fontFamily: "monospace",
                    fontSize: "0.62rem",
                    color: "#a78bfa",
                    letterSpacing: "0.06em",
                    marginLeft: 4,
                  }}>
                    ✦ +$100 / All available in VIP
                  </span>
                  {querytime !== null && (
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>
                      fetched in {querytime}ms
                    </span>
                  )}
                </div>
              </div>

              <HoldersTable_hackathon
                holders={holders}
                querytime_ms={querytime}
                selected_mode="Top 100"
              />
            </div>
          )}
        </div>
      </div>
    </HackathonSignGate>
  );
}
