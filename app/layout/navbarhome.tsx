"use client";

// Navbar fijo del home, clonado de sb_satelldex/front/layout/navbarhome.tsx.
// Adaptaciones para el demo:
//  - sin /api/wallet_status (no hay backend): role = "admin" si la pubkey
//    esta en /admins.json, sino null.
//  - sin Bootstrap offcanvas: el drawer mobile usa state React + overlay.
//  - items reducidos a las rutas que existen en el demo.

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const NAV_ITEMS = [
  { name: "WHAT IS",   route: "/" },
  { name: "HACKATHON", route: "/hackathonview" },
];

type Role = "admin" | null;
type RegenStatus = "idle" | "signing" | "running" | "done" | "error";

interface ProgressState {
  status:        "starting" | "running" | "done" | "error" | "idle";
  phase?:        string;
  current_idx?:  number;
  current_total?: number;
  current_token?: string | null;
  current_step?: string;
  completed?:    Array<{ slug: string; ok: boolean; elapsed_ms: number; holders_count?: number; symbol?: string; error?: string }>;
  elapsed_ms?:   number;
  error?:        string;
  result?:       any;
}

export default function Navbarx_home() {
  const pathname = usePathname();
  const { publicKey, connected, disconnect, signMessage } = useWallet();
  const [role, setRole] = useState<Role>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [regen, setRegen] = useState<RegenStatus>("idle");
  const [regenMsg, setRegenMsg] = useState<string | null>(null);
  const [regenProgress, setRegenProgress] = useState<ProgressState | null>(null);

  // Polling sobre /api/snap_progress mientras regen esta en "running".
  // Lee el archivo snap_progress.json que makesnap.ts va escribiendo.
  useEffect(() => {
    if (regen !== "running") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/snap_progress", { cache: "no-store" });
        const data: ProgressState = await res.json();
        if (cancelled) return;
        setRegenProgress(data);
        if (data.status === "done") {
          setRegen("done");
          const ok = data.result?.summary?.ok ?? data.completed?.filter(c => c.ok).length ?? 0;
          const total = data.result?.summary?.processed ?? data.current_total ?? 0;
          const ms = data.elapsed_ms ?? 0;
          setRegenMsg(`✓ ${ok}/${total} tokens · ${(ms / 1000).toFixed(1)}s`);
          setTimeout(() => { setRegen("idle"); setRegenMsg(null); setRegenProgress(null); }, 8000);
        } else if (data.status === "error") {
          setRegen("error");
          setRegenMsg(data.error ?? "snapshot error");
        }
      } catch {
        // polling errors silenciosos — siguen siendo lecturas, no afectan
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [regen]);

  // Dispara el endpoint REGEN: firma "satelldex-demo:regenerate:<ts>" con la
  // wallet admin y POST. El endpoint hace fire-and-forget: spawn makesnap.ts
  // en background, devuelve inmediato. El polling de snap_progress.json
  // (useEffect arriba) muestra el avance hasta que status=done|error.
  const handleRegen = async () => {
    setRegenMsg(null);
    setRegenProgress(null);
    if (!publicKey || !signMessage) {
      setRegen("error"); setRegenMsg("wallet not connected");
      return;
    }
    setRegen("signing");
    try {
      const ts  = Math.floor(Date.now() / 1000);
      const msg = `satelldex-demo:regenerate:${ts}`;
      const sigBytes = await signMessage(new TextEncoder().encode(msg));
      let binary = "";
      for (let i = 0; i < sigBytes.length; i++) binary += String.fromCharCode(sigBytes[i]);
      const sigB64 = btoa(binary);

      const res = await fetch("/api/regenerate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          pubkey:        publicKey.toBase58(),
          message:       msg,
          signature_b64: sigB64,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRegen("error");
        setRegenMsg(data.error || `HTTP ${res.status}`);
        return;
      }
      // fire-and-forget reconocido — pasa a running y el useEffect
      // arranca el polling.
      setRegen("running");
      setRegenMsg(`processing ${data.targets_count} tokens…`);
    } catch (e: any) {
      setRegen("error");
      setRegenMsg(e?.message ?? "regen failed");
    }
  };

  // role admin se determina file-based: lee /admins.json y matchea
  // la pubkey conectada. Sin DB, sin cookies, sin sesion.
  useEffect(() => {
    let active = true;
    async function loadRole() {
      if (!connected || !publicKey) {
        if (active) setRole(null);
        return;
      }
      try {
        const res = await fetch("/admins.json", { cache: "no-store" });
        const data = await res.json();
        const pubkeys: string[] = (data.admins || []).map((a: any) => a.pubkey);
        if (!active) return;
        setRole(pubkeys.includes(publicKey.toBase58()) ? "admin" : null);
      } catch {
        if (active) setRole(null);
      }
    }
    loadRole();
    return () => { active = false; };
  }, [connected, publicKey]);

  async function handleLogout() {
    try { await disconnect(); } catch (_) {}
    try { localStorage.removeItem("walletName"); } catch (_) {}
    setRole(null);
  }

  const isAdmin = role === "admin";

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          zIndex: 999,
          background: "#020810",
          borderBottom: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
          boxShadow: "0 1px 24px color-mix(in srgb, var(--accent) 10%, transparent)",
          padding: "0 24px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        <div className="nav-scanline" />

        {/* LOGO */}
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", position: "relative", zIndex: 1 }}>
          <span style={{ color: "var(--accent)", fontSize: "22px", lineHeight: 1, filter: "drop-shadow(0 0 6px var(--accent))" }}>◈</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontWeight: 400, color: "#fff", fontSize: "13px", letterSpacing: "0.1em" }}>
            SATELLDEX
          </span>
          <span style={{
            fontFamily: "monospace", fontSize: "9px",
            color: "var(--accent)", letterSpacing: "0.15em",
            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 50%, transparent)",
            borderRadius: "3px", padding: "2px 7px", marginLeft: "2px",
            boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 20%, transparent)",
          }}>
            DEMO
          </span>
        </a>

        {/* MENU desktop */}
        <ul className="nav-desktop" style={{
          display: "flex", alignItems: "center", gap: 0,
          margin: 0, padding: 0, listStyle: "none",
          position: "relative", zIndex: 1,
        }}>
          {NAV_ITEMS.map((item, idx) => {
            const active = pathname === item.route && item.route !== "/";
            return (
              <li key={idx}>
                <a
                  href={item.route}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: "9px",
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    color: active ? "var(--accent)" : "#e2e8f0",
                    textDecoration: "none",
                    padding: "6px 18px",
                    display: "block",
                    transition: "color 0.2s",
                    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <span style={{
                    color: active ? "var(--accent)" : "color-mix(in srgb, var(--accent) 55%, transparent)",
                    marginRight: "5px",
                    fontWeight: 900,
                  }}>//</span>
                  {item.name}
                </a>
              </li>
            );
          })}
        </ul>

        {/* DERECHA: LIVE + wallet + role badge + logout + hamburguesa */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative", zIndex: 1 }}>
          <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="nav-pulse-dot" />
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#22c55e", letterSpacing: "0.1em" }}>
              LIVE
            </span>
          </div>

          <div className="nav-desktop">
            <WalletMultiButton style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px", height: "34px", padding: "0 14px" }}>
              {connected ? undefined : "CONNECT"}
            </WalletMultiButton>
          </div>

          {isAdmin && (
            <span className="nav-desktop" style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "8px",
              color: "#22c55e",
              border: "1px solid #22c55e",
              borderRadius: "4px",
              padding: "4px 10px",
              letterSpacing: "0.1em",
              background: "transparent",
            }}>
              ADMIN
            </span>
          )}

          {/* Boton REGEN — solo admin · firma + POST /api/regenerate */}
          {isAdmin && (
            <button
              onClick={handleRegen}
              disabled={regen === "signing" || regen === "running"}
              className="nav-desktop"
              title="Scrape DexScreener para los CAs en targets.json"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "8px",
                color: regen === "error" ? "#fca5a5"
                     : regen === "done"  ? "#0a0e1a"
                     : "#fbbf24",
                border: `1px solid ${regen === "error" ? "#fca5a5" : "#fbbf24"}`,
                background: regen === "done" ? "#22c55e" : "transparent",
                borderRadius: "4px",
                padding: "4px 10px",
                letterSpacing: "0.1em",
                cursor: (regen === "signing" || regen === "running") ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {regen === "idle"     && "↻ REGEN"}
              {regen === "signing"  && "SIGNING…"}
              {regen === "running"  && "SCRAPING…"}
              {regen === "done"     && "✓ DONE"}
              {regen === "error"    && "× ERROR"}
            </button>
          )}

          {connected && (
            <button
              onClick={handleLogout}
              className="nav-desktop"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "9px",
                color: "#94a3b8",
                border: "1px solid #334155",
                borderRadius: "4px",
                padding: "5px 14px",
                letterSpacing: "0.06em",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              LOGOUT
            </button>
          )}

          {/* hamburguesa mobile (drawer custom, sin Bootstrap) */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="nav-hamburger"
            type="button"
            aria-label="Open menu"
            style={{
              background: "none",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              borderRadius: "4px",
              padding: "5px 9px",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "block", width: "18px", height: "2px", background: "var(--accent)", marginBottom: "4px" }} />
            <span style={{ display: "block", width: "14px", height: "2px", background: "var(--accent)", marginBottom: "4px" }} />
            <span style={{ display: "block", width: "18px", height: "2px", background: "var(--accent)" }} />
          </button>
        </div>
      </nav>

      {/* DRAWER mobile */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 998,
              background: "rgba(0,0,0,0.6)",
            }}
          />
          <aside style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: "min(80vw, 320px)",
            background: "#020810",
            borderLeft: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
            zIndex: 1000,
            padding: "16px",
            display: "flex", flexDirection: "column", gap: "8px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--accent)", fontSize: "16px" }}>◈</span>
                <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#fff", fontSize: "13px", letterSpacing: "0.1em" }}>
                  SATELLDEX
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                style={{
                  background: "transparent", border: "none",
                  color: "#94a3b8", fontSize: "22px", cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {NAV_ITEMS.map((item, idx) => (
                <li key={idx} style={{ borderBottom: "1px solid color-mix(in srgb, var(--accent) 7%, transparent)" }}>
                  <a
                    href={item.route}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: "block",
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: "11px",
                      fontWeight: 400,
                      letterSpacing: "0.05em",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "16px 8px",
                    }}
                  >
                    <span style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)", marginRight: "10px", fontFamily: "monospace" }}>//</span>
                    {item.name}
                  </a>
                </li>
              ))}

              <li style={{ borderBottom: "1px solid color-mix(in srgb, var(--accent) 7%, transparent)", padding: "12px 8px" }}>
                <WalletMultiButton style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px", height: "34px", padding: "0 14px", width: "100%" }}>
                  {connected ? undefined : "CONNECT"}
                </WalletMultiButton>
              </li>

              {/* Boton REGEN dentro del drawer mobile (admin) */}
              {isAdmin && (
                <li style={{ borderBottom: "1px solid color-mix(in srgb, var(--accent) 7%, transparent)" }}>
                  <button
                    onClick={() => { handleRegen(); setDrawerOpen(false); }}
                    disabled={regen === "signing" || regen === "running"}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: "11px", fontWeight: 400, letterSpacing: "0.05em",
                      color: "#fbbf24", textDecoration: "none",
                      padding: "16px 8px",
                      background: "transparent", border: "none",
                      cursor: (regen === "signing" || regen === "running") ? "wait" : "pointer",
                    }}
                  >
                    <span style={{ color: "#a16207", marginRight: "10px", fontFamily: "monospace" }}>//</span>
                    {regen === "idle"     && "↻ REGEN SCRAPE"}
                    {regen === "signing"  && "SIGNING…"}
                    {regen === "running"  && "SCRAPING…"}
                    {regen === "done"     && "✓ REGEN DONE"}
                    {regen === "error"    && "× REGEN ERROR"}
                  </button>
                </li>
              )}

              {connected && (
                <li style={{ borderBottom: "1px solid color-mix(in srgb, var(--accent) 7%, transparent)" }}>
                  <button
                    onClick={() => { handleLogout(); setDrawerOpen(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: "11px", fontWeight: 400, letterSpacing: "0.05em",
                      color: "#94a3b8", textDecoration: "none",
                      padding: "16px 8px",
                      background: "transparent", border: "none", cursor: "pointer",
                    }}
                  >
                    <span style={{ color: "#475569", marginRight: "10px", fontFamily: "monospace" }}>//</span>
                    LOGOUT{isAdmin ? " (ADMIN)" : ""}
                  </button>
                </li>
              )}
            </ul>
          </aside>
        </>
      )}

      {/* Panel progresivo durante REGEN (admin) — visible mientras hay
          actividad o un resultado reciente. Lista los tokens completados
          + el token actual + la fase actual. */}
      {(regen === "running" || regen === "done" || regen === "error") && (
        <div style={{
          position: "fixed", right: 24, bottom: 24,
          width: "min(380px, 92vw)",
          maxHeight: "min(60vh, 480px)",
          overflowY: "auto",
          background: "#0d1117",
          border: `1px solid ${
            regen === "error" ? "rgba(252,165,165,0.5)"
            : regen === "done" ? "rgba(34,197,94,0.5)"
            : "rgba(251,191,36,0.5)"
          }`,
          borderRadius: 10, padding: "14px 16px",
          fontFamily: "monospace",
          zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}>
          {/* header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 10, paddingBottom: 8,
            borderBottom: "1px solid #1e293b",
          }}>
            <span style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 9,
              letterSpacing: "0.12em",
              color: regen === "error" ? "#fca5a5"
                   : regen === "done"  ? "#22c55e"
                   : "#fbbf24",
            }}>
              {regen === "done"  ? "✓ SNAPSHOT DONE"
               : regen === "error" ? "× SNAPSHOT ERROR"
               : "↻ SNAPSHOT RUNNING"}
            </span>
            {regenProgress?.elapsed_ms !== undefined && (
              <span style={{ fontSize: 10, color: "#64748b" }}>
                {(regenProgress.elapsed_ms / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {/* mensaje de estado actual */}
          {regenMsg && (
            <p style={{
              margin: "0 0 10px", fontSize: 11,
              color: regen === "error" ? "#fca5a5"
                   : regen === "done"  ? "#22c55e"
                   : "#e2e8f0",
            }}>
              {regenMsg}
            </p>
          )}

          {/* progreso del token en curso */}
          {regen === "running" && regenProgress && (
            <div style={{ marginBottom: 10, padding: "8px 10px", background: "#0a0e1a", borderRadius: 6, border: "1px solid #1e293b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>
                  [{regenProgress.current_idx ?? 0}/{regenProgress.current_total ?? "?"}]
                  &nbsp;{regenProgress.current_token ?? "…"}
                </span>
                <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>
                  {regenProgress.phase ?? ""}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>
                {regenProgress.current_step ?? "…"}
              </p>

              {/* barra de progreso por tokens completados */}
              {regenProgress.current_total ? (
                <div style={{ marginTop: 8, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(100, ((regenProgress.completed?.length ?? 0) / regenProgress.current_total) * 100)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #fbbf24, #06b6d4)",
                    transition: "width 0.3s",
                  }} />
                </div>
              ) : null}
            </div>
          )}

          {/* lista de tokens completados */}
          {regenProgress?.completed && regenProgress.completed.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {regenProgress.completed.map((c, i) => (
                <div key={`${c.slug}_${i}`} style={{
                  display: "grid", gridTemplateColumns: "16px 1fr auto auto",
                  gap: 6, alignItems: "baseline",
                  fontSize: 10,
                }}>
                  <span style={{ color: c.ok ? "#22c55e" : "#fca5a5" }}>
                    {c.ok ? "✓" : "×"}
                  </span>
                  <span style={{ color: "#e2e8f0", fontWeight: 700 }}>
                    {c.slug}
                    {c.symbol && <span style={{ color: "#64748b", marginLeft: 4 }}>({c.symbol})</span>}
                  </span>
                  <span style={{ color: "#94a3b8" }}>
                    {c.holders_count !== undefined ? c.holders_count.toLocaleString() : "—"}
                  </span>
                  <span style={{ color: "#475569" }}>
                    {(c.elapsed_ms / 1000).toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
