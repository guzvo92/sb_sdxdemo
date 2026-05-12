// Barra inferior del hero con la stack tecnologica usada.
// Clonado literal de sb_satelldex (sin dependencias externas).

const STATS = [
  { value: "Meteora",   label: "LIQUIDITY POOLS" },
  { value: "Raydium",   label: "LIQUIDITY POOLS" },
  { value: "Solscan",   label: "RPC & INDEXING" },
  { value: "QuickNode", label: "RPC & INDEXING" },
];

export default function SecStatsbar() {
  return (
    <div
      style={{
        borderTop: "1px solid rgba(6,182,212,0.1)",
        borderBottom: "1px solid rgba(6,182,212,0.1)",
        background: "rgba(6,182,212,0.03)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "48px 24px 40px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "24px",
          textAlign: "center",
        }}
        className="stats-grid sec-statsbar-wrap"
      >
        <div style={{ gridColumn: "1 / -1", marginBottom: "20px" }}>
          <p
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "10px",
              color: "#ffffff",
              margin: 0,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Tech Stack used:
          </p>
        </div>
        {STATS.map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "14px",
                fontWeight: 700,
                color: "#0891b2",
                margin: 0,
                lineHeight: 1.2,
                textShadow: "0 0 4px rgba(6,182,212,0.3)",
              }}
            >
              {s.value}
            </p>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "7px",
                color: "#ffffff",
                margin: 0,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                lineHeight: 1.8,
              }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
