"use client";

// Roller infinito con metricas agregadas del scanner.
// Lee de las fuentes reales que REGEN actualiza:
//   - targets.json            -> ntokens (CAs validos no placeholder)
//   - /api/snap_index         -> nsnapshots (folders) + ndays (dias unicos)
//   - snapshots/<latest>/*    -> nwallets (sum nholders_full)
//   - dexscraptokens/<latest> -> npools (sum tokens[].npools)

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

// Filtra CAs validos: descarta placeholders (PASTE_*) y largos <32.
function validTargets(arr: any[]): { slug: string; ca: string }[] {
  const out: { slug: string; ca: string }[] = [];
  for (const t of (arr || [])) {
    const ca = String(t?.ca || "");
    if (!ca || ca.startsWith("PASTE_") || ca.length < 32) continue;
    out.push({ slug: String(t.slug || ""), ca });
  }
  return out;
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
        const [targetsRes, idxRes] = await Promise.all([
          fetch("/targets.json",      { cache: "no-store" }).then(r => r.json()),
          fetch("/api/snap_index",    { cache: "no-store" }).then(r => r.json()),
        ]);

        // ntokens: targets validos en targets.json (los que REGEN scrapea).
        const targets = validTargets(targetsRes?.targets);
        const ntokens = targets.length;

        // nsnapshots: cantidad de folders datados en snapshots/.
        const snapFolders: string[] = idxRes?.snapshots?.folders || [];
        const nsnapshots = snapFolders.length;

        // ndays: dias unicos a partir del prefijo YYYY_MM_DD de cada folder.
        const uniqueDays = new Set<string>();
        for (const f of snapFolders) uniqueDays.add(f.slice(0, 10));
        const ndays = uniqueDays.size;

        const latestSnap = idxRes?.snapshots?.latest;
        const latestDex  = idxRes?.dexscraptokens?.latest;

        // nwallets: suma de nholders_full por slug en el snapshot mas reciente.
        let nwallets = 0;
        if (latestSnap && targets.length > 0) {
          const snaps = await Promise.all(
            targets.map(t => fetch(`/demo-data/snapshots/${latestSnap}/${t.slug}.json`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)),
          );
          for (const s of snaps) {
            if (s && s.nholders_full != null) nwallets += Number(s.nholders_full) || 0;
          }
        }

        // npools: suma de npools por token en el dexscrape mas reciente.
        let npools = 0;
        if (latestDex) {
          const dex = await fetch(`/demo-data/dexscraptokens/${latestDex}/all.json`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);
          if (dex && Array.isArray(dex.tokens)) {
            for (const t of dex.tokens) npools += Number(t?.npools) || 0;
          }
        }

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
