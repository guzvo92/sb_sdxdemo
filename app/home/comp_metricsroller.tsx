"use client";

// Roller infinito con metricas agregadas del scanner.
// En el demo no hay endpoint /api/db_metrics_summary, asi que computamos
// los numeros desde los JSONs estaticos: tokens.json (cuantos tokens),
// global_history.json (cuantos snaps), holders/*.json (suma wallets), etc.

import { useEffect, useState } from "react";

interface RollerMetrics {
  ntokens: number;
  nsnapshots: number;
  nwallets: number;
  npools: number;
  ndays: number;
}

const ROLLER_ITEMS = [
  { key: "ntokens",    label: "UNIQUE TOKENS" },
  { key: "nsnapshots", label: "SNAPSHOTS" },
  { key: "nwallets",   label: "UNIQUE WALLETS" },
  { key: "npools",     label: "POOLS" },
  { key: "ndays",      label: "TRACKING DAYS" },
];

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export function Comp_MetricsRoller() {
  const [metrics, setMetrics] = useState<RollerMetrics>({
    ntokens: 0,
    nsnapshots: 0,
    nwallets: 0,
    npools: 0,
    ndays: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function computeMetrics() {
      try {
        const [tokensRes, histRes] = await Promise.all([
          fetch("/demo-data/tokens.json").then(r => r.json()),
          fetch("/demo-data/global/global_history.json").then(r => r.json()),
        ]);

        // ntokens: cuantos tokens trackeados.
        const ntokens = Array.isArray(tokensRes) ? tokensRes.length : 0;
        // nsnapshots: suma de timestamps de todos los tokens del history.
        let nsnapshots = 0;
        if (histRes.ok && Array.isArray(histRes.tokens)) {
          for (const t of histRes.tokens) {
            nsnapshots += (t.timestamps?.length || 0);
          }
        }
        // nwallets: suma de "holders" declarados en tokens.json.
        let nwallets = 0;
        if (Array.isArray(tokensRes)) {
          for (const t of tokensRes) {
            nwallets += (t.holders || 0);
          }
        }
        // npools: 1 pool por token (asuncion del demo).
        const npools = ntokens;
        // ndays: el demo arranca con 1 dia.
        const ndays = nsnapshots > 0 ? 1 : 0;

        if (!cancelled) {
          setMetrics({ ntokens, nsnapshots, nwallets, npools, ndays });
        }
      } catch {
        // mantiene zeros en error
      }
      if (!cancelled) setLoading(false);
    }

    computeMetrics();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <style>{`
        .roller-track {
          display: flex;
          animation: rollerScroll 30s linear infinite;
          width: max-content;
        }
        .roller-track:hover {
          animation-play-state: paused;
        }
        @keyframes rollerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
        .roller-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 48px;
          border-right: 1px solid rgba(6,182,212,0.15);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .roller-value {
          font-family: "Press Start 2P", monospace;
          font-size: 11px;
          font-weight: 700;
          color: #06b6d4;
        }
        .roller-label {
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          color: #ffffff;
          text-transform: uppercase;
        }
        .roller-separator {
          color: #06b6d440;
          font-size: 10px;
          padding: 0 4px;
        }
      `}</style>

      <div
        style={{
          overflow: "hidden",
          background: "rgba(6,182,212,0.03)",
          borderTop: "1px solid rgba(6,182,212,0.1)",
          borderBottom: "1px solid rgba(6,182,212,0.1)",
          padding: "10px 0",
        }}
      >
        <div className="roller-track">
          {[...ROLLER_ITEMS, ...ROLLER_ITEMS, ...ROLLER_ITEMS, ...ROLLER_ITEMS].map((item, idx) => {
            const value = (metrics as any)[item.key] ?? 0;
            return (
              <span key={idx} className="roller-item">
                <span className="roller-value">
                  {loading ? "..." : formatNumber(value)}
                </span>
                <span className="roller-label">{item.label}</span>
                <span className="roller-separator">◆</span>
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}
