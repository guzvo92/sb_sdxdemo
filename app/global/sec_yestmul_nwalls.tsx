"use client";

import { useEffect, useState } from "react";

interface Category { id: number; name: string; color: string; tokens: string[]; }
interface Props {
  fullGlobal: any[];
  categories: Category[];
  metrics: string[];
  title: string;
  suffix?: string;
}

export default function Sec_yestmulti_nwallets_barchart({ fullGlobal, categories, metrics, title, suffix = "" }: Props) {

  const [filter, setFilter] = useState<number | null>(null);
  const tokenCatMap: Record<string, number> = {};
  for (const cat of categories) {
    for (const t of cat.tokens) {
      tokenCatMap[t] = cat.id;
    }
  }
  const filtered = filter === null
    ? fullGlobal
    : fullGlobal.filter(e => tokenCatMap[e.token] === filter);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window === "undefined" || !window.Chart) return;
      if (!filtered || filtered.length === 0) return;
      clearInterval(interval);

      const tokenNames = filtered.map(t => t.token.toUpperCase());
      const baseColors = [
        "#00e1ff", "#2dd4bf", "#fbbf24", "#fb923c",
        "#f43f5e", "#a855f7", "#6366f1", "#22c55e", "#ef4444"
      ];

      const datasets = metrics.map((metric, mIndex) => {
        const color = baseColors[mIndex % baseColors.length];
        const values = filtered.map(({ data }) => {
          let val: number | null = null;
          data?.walletblocks?.forEach((wb: any) => {
            const last = wb.timestamps?.[wb.timestamps.length - 1];
            if (!last) return;
            if (last.walletblocks && last.walletblocks[metric] !== undefined) {
              const raw = last.walletblocks[metric];
              const parsed = Number(String(raw).replace(/,/g, ""));
              val = isNaN(parsed) ? null : parsed;
            }
          });
          return val;
        });
        return {
          label: metric.replace(/nholders_/g, "").replace(/_/g, " ").toUpperCase(),
          data: values,
          backgroundColor: color + "AA",
          borderColor: color,
          borderWidth: 1.5
        };
      });

      const canvasId = `globalWalletsBarChart${suffix}_${filter ?? "all"}`;
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) return;
      const chart = new window.Chart(canvas, {
        type: "bar",
        data: { labels: tokenNames, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: "#fff", font: { size: 11 } } },
            tooltip: { backgroundColor: "rgba(0,0,0,0.7)", titleColor: "#fff", bodyColor: "#fff" }
          },
          scales: {
            x: { ticks: { color: "#ccc", maxRotation: 45 } },
            y: { ticks: { color: "#ccc" }, beginAtZero: true }
          }
        }
      });
      return () => chart.destroy();
    }, 200);

    return () => clearInterval(interval);
  }, [filtered, metrics, filter, suffix]);

  const canvasId = `globalWalletsBarChart${suffix}_${filter ?? "all"}`;

  return (
    <div style={{
      background: "#0d1117",
      border: "1px solid #1e293b",
      borderRadius: 12,
      padding: "20px 20px 16px",
      marginTop: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <h3 style={{ color: "#e2e8f0", fontFamily: "'Press Start 2P', monospace", fontWeight: 700, fontSize: "11px", margin: 0, textAlign: "center", letterSpacing: "0.06em" }}>
            {title.split("—")[0].trim()}
          </h3>
          <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "9px", textAlign: "center", letterSpacing: "0.04em" }}>
            {title.split("—")[1]?.trim() ?? ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilter(null)}
            style={{
              background: filter === null ? "#06b6d418" : "transparent",
              border: `1px solid ${filter === null ? "#06b6d4" : "#1e293b"}`,
              borderRadius: 5, padding: "3px 10px", cursor: "pointer",
              color: filter === null ? "#e2e8f0" : "#475569",
              fontFamily: "monospace", fontSize: "0.68rem", fontWeight: filter === null ? 700 : 400,
            }}
          >
            ALL
          </button>
          {categories.map(cat => {
            const isActive = filter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: isActive ? `${cat.color}18` : "transparent",
                  border: `1px solid ${isActive ? cat.color : "#1e293b"}`,
                  borderRadius: 5, padding: "3px 10px", cursor: "pointer",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color }} />
                <span style={{
                  color: isActive ? "#e2e8f0" : "#475569",
                  fontFamily: "monospace", fontSize: "0.68rem", fontWeight: isActive ? 700 : 400,
                }}>
                  {cat.name.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ height: "400px", width: "100%" }}>
        <canvas key={canvasId} id={canvasId}></canvas>
      </div>
    </div>
  );
}
