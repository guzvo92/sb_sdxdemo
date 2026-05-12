"use client";

// Hero del home: terminal animada + headline + roller + VipCard +
// (free tokens / community requests) + VipInterestButton.
// Clonado del prod, importa los components adaptados al demo.

import { Comp_TextAnimation } from "./a11animator";
import { Comp_TokenSelector, VipCard, VipInterestButton } from "./comp_tokenselector";
import { Comp_MetricsRoller } from "./comp_metricsroller";
import SecCommunityReq from "./sec6_communityreq";

export default function SecHero() {
  return (
    <section
      id="bannerhome"
      style={{
        width: "100%",
        minHeight: "75px",
        background: "#000",
        borderBottom: "1px solid rgba(6,182,212,0.15)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* grid de fondo decorativo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* glow izquierdo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-120px",
          left: "-120px",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="hero-container"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "48px 32px 0",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* fila 1: terminal + headline */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            alignItems: "center",
            marginBottom: "48px",
          }}
          className="hero-grid hero-fila1"
        >
          <div className="hero-cmd-col" style={{ minWidth: 0 }}>
            <Comp_TextAnimation />
          </div>

          <div className="hero-headline-col" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <span style={{ display: "inline-block", width: "32px", height: "1px", background: "linear-gradient(90deg, transparent, #06b6d4)" }} />
              <span className="hero-eyebrow-text" style={{ fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.3em", color: "#06b6d4", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                SOLANA INTELLIGENCE PLATFORM
              </span>
            </div>

            <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "clamp(16px, 2.8vw, 34px)", fontWeight: "400", lineHeight: 1.4, marginBottom: "12px", letterSpacing: "0.02em", color: "#f0f6ff" }}>
              See what the
            </h1>
            <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "clamp(16px, 2.8vw, 34px)", fontWeight: "400", lineHeight: 1.4, marginBottom: "28px", letterSpacing: "0.02em", background: "linear-gradient(90deg, #06b6d4 0%, #818cf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              blockchain is doing.
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
              <div style={{ width: "4px", height: "4px", background: "#06b6d4", borderRadius: "50%" }} />
              <div style={{ flex: 1, maxWidth: "200px", height: "1px", background: "linear-gradient(90deg, rgba(6,182,212,0.6), transparent)" }} />
            </div>

            <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.75, marginBottom: 0, maxWidth: "400px", fontFamily: "monospace", letterSpacing: "0.02em" }}>
              Real-time holder analytics, liquidity distribution
              <br />
              and historical snapshots for Solana tokens —
              <br />
              <span style={{ color: "#94a3b8" }}>for traders who see deeper than price.</span>
            </p>
          </div>
        </div>

        {/* roller — dentro del container */}
        <div className="hero-roller">
          <Comp_MetricsRoller />
        </div>
      </div>

      {/* fila 2: contenido principal */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 32px 56px", position: "relative", zIndex: 1, width: "100%" }}>

        {/* card VIP — fila completa, centrada */}
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center" }}>
          <VipCard />
        </div>

        {/* grid 2 columnas: free tokens (izq) + community requests (der) */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start", marginBottom: "32px" }}
          className="hero-tokensrow"
        >
          <Comp_TokenSelector />
          <div className="community-col">
            <SecCommunityReq />
          </div>
        </div>

        {/* card alpha VIP tester — fila completa, centrada */}
        <div style={{ marginTop: "64px", display: "flex", justifyContent: "center" }}>
          <VipInterestButton />
        </div>
      </div>
    </section>
  );
}
