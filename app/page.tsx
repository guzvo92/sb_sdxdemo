"use client";

// Landing principal del demo, clonada de sb_satelldex/front/app/page.tsx.
// Ruta marketing: hero + statsbar + hexnode + pillars + plans + banner
// hackathon. Sin sign gate. La vista per-token con firma + holders vive
// en /hackathonview, no en este home.

import Navbarx_home from "./layout/navbarhome";
import SecHero      from "./home/sec1_hero";
import SecStatsbar  from "./home/sec2_statsbar";
import SecHexnode   from "./home/sec3_hexnode";
import SecPillars   from "./home/sec4_pillars";
import SecPlans     from "./home/sec5_plans";

export default function Home() {
  return (
    <div style={{ background: "#0a0e1a", minHeight: "100vh", color: "#fff" }}>
      <Navbarx_home />

      {/* banner hackathon — link directo a las vistas VIP para jueces
          (las rutas /hackathonview y /globalhackathon se clonan despues) */}
      <div
        style={{
          marginTop: 56,
          padding: "10px 16px",
          background: "linear-gradient(90deg, rgba(167,139,250,0.12) 0%, rgba(6,182,212,0.12) 100%)",
          borderBottom: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
          fontFamily: "monospace",
          fontSize: 12,
          color: "#e2e8f0",
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        <span style={{ color: "#a78bfa", fontWeight: 700 }}>◈</span>{" "}
        For the judges at{" "}
        <strong style={{ color: "#fbbf24", fontWeight: 900, letterSpacing: "0.06em" }}>
          Solana Frontier Hackathon 2026 Colosseum
        </strong>
        : try our VIP views at memes section{" — "}
        <a
          href="/hackathonview"
          style={{ color: "#06b6d4", fontWeight: 700, textDecoration: "underline" }}
        >
          /hackathonview
        </a>{" · "}
        <a
          href="/globalhackathon"
          style={{ color: "#06b6d4", fontWeight: 700, textDecoration: "underline" }}
        >
          /globalhackathon
        </a>
      </div>

      <div>
        <SecHero />
        <SecStatsbar />
        <SecHexnode />
        <SecPillars />
        <SecPlans />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid       { grid-template-columns: 1fr !important; }
          .hero-tokensrow  { grid-template-columns: 1fr !important; }
          .pillars-grid    { grid-template-columns: 1fr !important; }
          .plans-grid      { grid-template-columns: 1fr !important; }
          .stats-grid      { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
