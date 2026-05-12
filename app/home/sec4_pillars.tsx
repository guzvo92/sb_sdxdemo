// Tres pilares "How it works" del home: HOLDER SCAN, LIQMAP, TIME SERIES.
// Clonado literal de sb_satelldex (data hardcoded, sin deps externas).

const PILLARS = [
  {
    icon: "◈",
    tag: "DEMO FREE",
    tagColor: "#06b6d4",
    title: "HOLDER SCAN",
    subs: [] as string[],
    body: "Every run pulls the full holder list from the blockchain via Helius. Each wallet is classified by USD value — from whales (A, >$50k) to micro-holders (X, <$100). Know exactly who is holding and how much.",
  },
  {
    icon: "⬡",
    tag: "DEMO FREE",
    tagColor: "#06b6d4",
    title: "LIQMAP",
    subs: [] as string[],
    body: "Track where supply is concentrated: main pool, top wallets, and distributed holders. Spot abnormal pool concentration before it becomes a problem.",
  },
  {
    icon: "⌇",
    tag: "DEMO VIP",
    tagColor: "#a855f7",
    title: "TIME SERIES",
    subs: [
      "Global view by token types of historic snapshots",
      "Detailed study for all tokens by holders sections",
      "Detailed query for top100, +100usd and all holders",
    ],
    body: "Chart the full evolution of wallet groups and liquidity clusters across every snapshot. See how holder distribution shifts over time.",
  },
];

export default function SecPillars() {
  return (
    <div className="sec-pillars-wrap" style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            letterSpacing: "0.2em",
            color: "#ffffff",
            marginBottom: "12px",
          }}
        >
          // HOW IT WORKS
        </p>
        <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "clamp(13px, 1.8vw, 22px)", fontWeight: "400", lineHeight: 1.5, margin: 0 }}>
          Three layers of intelligence
        </h2>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}
        className="pillars-grid"
      >
        {PILLARS.map((p, i) => (
          <div
            key={i}
            style={{
              background: "#0f1623",
              border: "1px solid #1e293b",
              borderTop: `2px solid ${p.tagColor}`,
              borderRadius: "10px",
              padding: "28px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{ fontSize: "20px", color: p.tagColor, lineHeight: 1 }}>{p.icon}</span>
              <span
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "7px",
                  letterSpacing: "0.08em",
                  color: p.tagColor,
                  background: p.tagColor + "18",
                  border: `1px solid ${p.tagColor}44`,
                  borderRadius: "3px",
                  padding: "3px 8px",
                }}
              >
                {p.tag}
              </span>
            </div>
            <h3
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "10px",
                fontWeight: "400",
                letterSpacing: "0.08em",
                marginBottom: "8px",
                color: "#fff",
                lineHeight: 1.6,
              }}
            >
              {p.title}
            </h3>
            {p.subs.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                {p.subs.map((s, j) => (
                  <li key={j} style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: "6px",
                    color: p.tagColor,
                    letterSpacing: "0.06em",
                    lineHeight: 2,
                  }}>
                    · {s}
                  </li>
                ))}
              </ul>
            )}
            <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
