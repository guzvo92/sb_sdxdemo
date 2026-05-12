// Dos planes: FREE (Demo Free) y VIP/ALPHA (early adopter).
// FREE -> /hackathonview (vista jueces) · ALPHA -> /global.
// El boton ALPHA queda informativo (no hay backend para registrar interes).

const FREE_FEATURES = [
  "Price, supply & amount lost",
  "Liquidity distribution — Pool / Top / Others",
  "Accounts distribution A–X (classified by USD value)",
  "Token: PLAY (public demo)",
];

const VIP_FEATURES = [
  "Everything in Free",
  "Any tracked token",
  "Main pool + top ranked pools table",
  "3 historical charts — holders %, wallet groups, liq clusters",
  "Full holders table — top 100 / VIP / all holders",
  "Detailed holders listing: $100 USD threshold, top 100 or all",
  "Multi-token global view",
  "Global view by token type — memes, defi, RWA & more",
];

export default function SecPlans() {
  return (
    <div
      style={{
        background: "rgba(6,182,212,0.02)",
        borderTop: "1px solid rgba(6,182,212,0.08)",
        borderBottom: "1px solid rgba(6,182,212,0.08)",
      }}
    >
      <div className="sec-plans-wrap" style={{ maxWidth: "900px", margin: "0 auto", padding: "72px 24px" }}>
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
            // ACCESS LEVELS
          </p>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "clamp(11px, 1.6vw, 20px)", fontWeight: "400", lineHeight: 1.6, margin: 0 }}>
            Free to explore. VIP to see everything.
          </h2>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
          className="plans-grid"
        >
          {/* FREE */}
          <div
            style={{
              background: "#0f1623",
              border: "1px solid #1e293b",
              borderTop: "2px solid #06b6d4",
              borderRadius: "10px",
              padding: "32px",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "9px",
                  letterSpacing: "0.15em",
                  color: "#06b6d4",
                  background: "#06b6d418",
                  border: "1px solid #06b6d444",
                  borderRadius: "3px",
                  padding: "2px 8px",
                }}
              >
                FREE
              </span>
              <h3
                style={{
                  fontFamily: "monospace",
                  fontSize: "20px",
                  fontWeight: "800",
                  margin: "12px 0 4px",
                  color: "#fff",
                }}
              >
                Demo Free
              </h3>
              <p style={{ color: "#4a5568", fontSize: "12px", margin: 0, fontFamily: "monospace" }}>
                No signup required
              </p>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
              {FREE_FEATURES.map((f, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: "10px",
                    fontSize: "13px",
                    color: "#94a3b8",
                    padding: "7px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span style={{ color: "#06b6d4", flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="/hackathonview"
              style={{
                display: "block",
                textAlign: "center",
                fontFamily: "monospace",
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                color: "#06b6d4",
                border: "1px solid rgba(6,182,212,0.4)",
                borderRadius: "6px",
                padding: "12px",
                textDecoration: "none",
              }}
            >
              OPEN DEMO ↗
            </a>
          </div>

          {/* VIP / ALPHA */}
          <div
            style={{
              background: "#0f1623",
              border: "1px solid rgba(168,85,247,0.3)",
              borderTop: "2px solid #a855f7",
              borderRadius: "10px",
              padding: "32px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "200px",
                height: "200px",
                background: "radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "9px",
                  letterSpacing: "0.15em",
                  color: "#a855f7",
                  background: "#a855f718",
                  border: "1px solid #a855f744",
                  borderRadius: "3px",
                  padding: "2px 8px",
                }}
              >
                ALPHA
              </span>
              <h3
                style={{
                  fontFamily: "monospace",
                  fontSize: "20px",
                  fontWeight: "800",
                  margin: "12px 0 4px",
                  color: "#fff",
                }}
              >
                Demo VIP
              </h3>
              <p style={{ color: "#4a5568", fontSize: "12px", margin: 0, fontFamily: "monospace" }}>
                Early access — limited seats
              </p>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
              {VIP_FEATURES.map((f, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: "10px",
                    fontSize: "13px",
                    color: i === 0 ? "#64748b" : "#94a3b8",
                    padding: "7px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    fontStyle: i === 0 ? "italic" : "normal",
                  }}
                >
                  <span style={{ color: "#a855f7", flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="/globalhackathon"
              style={{
                display: "block",
                textAlign: "center",
                fontFamily: "monospace",
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                color: "#0a0e1a",
                background: "#a855f7",
                borderRadius: "6px",
                padding: "12px",
                textDecoration: "none",
              }}
            >
              GO TO GLOBAL ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
