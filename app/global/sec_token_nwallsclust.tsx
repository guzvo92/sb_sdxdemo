"use client";

import { useEffect } from "react";

// Etiquetas marinas para los brackets de Account Distribution.
const BRACKET_META: Record<string, { icon: string; tier: string; range: string; color: string; enabled: boolean }> = {
  "nholders_full":          { icon: "🌊", tier: "FULL",     range: "all",        color: "#00e1ff", enabled: false },
  "nholders_over100":       { icon: "🐠", tier: "+FISH",    range: "+$100",      color: "#2dd4bf", enabled: true  },
  "nholders_over50000":     { icon: "🐋", tier: "WHALE",    range: "+$50k",      color: "#fbbf24", enabled: true  },
  "nholders_10000to50000":  { icon: "🦈", tier: "SHARK",    range: "$10k-50k",   color: "#fb923c", enabled: true  },
  "nholders_5000to10000":   { icon: "🐬", tier: "DOLPHIN",  range: "$5k-10k",    color: "#f43f5e", enabled: true  },
  "nholders_1000to5000":    { icon: "🐟", tier: "FISH",     range: "$1k-5k",     color: "#a855f7", enabled: true  },
  "nholders_500to1000":     { icon: "🦀", tier: "CRAB",     range: "$500-1k",    color: "#6366f1", enabled: true  },
  "nholders_100to500":      { icon: "🦐", tier: "SHRIMP",   range: "$100-500",   color: "#22c55e", enabled: true  },
  "nholders_under100":      { icon: "🦠", tier: "PLANKTON", range: "<$100",      color: "#ef4444", enabled: false },
};

interface Props {
  token: string;
  globaldata: any;
  suffix?: string;
}

export default function Sec_nwallsclust({ token, globaldata, suffix = "" }: Props) {
  useEffect(() => {
    let interval = setInterval(() => {
      if (!globaldata?.walletblocks) return;
      if (typeof window === "undefined" || !(window as any).Chart) return;
      clearInterval(interval);

      // Aplana timestamps de todos los dayblocks en una sola serie temporal
      const flat: any[] = [];
      globaldata.walletblocks.forEach((dayblock: any) => {
        dayblock.timestamps.forEach((t: any) => {
          const run = Number(t.runts || t.ts);
          if (isNaN(run)) return;
          flat.push({ ts: run, ...t.walletblocks });
        });
      });
      flat.sort((a, b) => a.ts - b.ts);
      if (flat.length === 0) return;

      // Etiquetas: fecha+hora corta para el eje X
      const labels = flat.map(p => {
        const d = new Date(p.ts * 1000);
        return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      });

      // Datasets activos: un trazo por bracket habilitado
      const datasets: any[] = [];
      for (const metric in BRACKET_META) {
        const meta = BRACKET_META[metric];
        if (!meta.enabled) continue;
        datasets.push({
          label: `${meta.icon} ${meta.tier} ${meta.range}`,
          data: flat.map(p => Number(p[metric]) || 0),
          borderColor: meta.color,
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          fill: false,
        });
      }

      const ctxId = `nwallsclust_${token}_${suffix}`;
      const canvas = document.getElementById(ctxId) as HTMLCanvasElement | null;
      if (!canvas) return;
      const old = (window as any).Chart.getChart?.(canvas);
      if (old) old.destroy();
      new (window as any).Chart(canvas, {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: "#fff", font: { size: 10 } } },
            title:  { display: true, text: token.toUpperCase(), color: "#a78bfa", font: { size: 12 } },
          },
          scales: {
            x: { ticks: { color: "#94a3b8", maxRotation: 45, font: { size: 9 } } },
            y: { ticks: { color: "#94a3b8", font: { size: 10 } }, beginAtZero: true },
          },
        },
      });
    }, 200);

    return () => {
      clearInterval(interval);
      const ctxId = `nwallsclust_${token}_${suffix}`;
      const canvas = document.getElementById(ctxId) as HTMLCanvasElement | null;
      if (canvas) {
        const old = (window as any).Chart?.getChart?.(canvas);
        if (old) old.destroy();
      }
    };
  }, [token, globaldata, suffix]);

  return (
    <div style={{ background: "#0d1117", border: "1px solid rgba(167,139,250,0.18)", borderRadius: 10, padding: 14, height: 320 }}>
      <canvas id={`nwallsclust_${token}_${suffix}`} />
    </div>
  );
}
