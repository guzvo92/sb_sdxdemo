"use client";

import { useEffect, useState } from "react";
import { slicetext } from "../utils/generalutils";

interface TextDataProps {
  data: any;
  globaldata?: any;
}

export default function TextData_hackathon({ data, globaldata }: TextDataProps) {

  const p_top10  = parseFloat(data.an_perc_top10  || 0);
  const p_top20  = parseFloat(data.an_perc_top20  || 0);
  const p_top50  = parseFloat(data.an_perc_top50  || 0);
  const p_top100 = parseFloat(data.an_perc_top100 || 0);
  const p_pool   = parseFloat(data.an_perc_bigpool || 0);

  const top1_10   = p_top10;
  const top11_20  = parseFloat((p_top20 - p_top10).toFixed(2));
  const top21_50  = parseFloat((p_top50 - p_top20).toFixed(2));
  const top51_100 = parseFloat((p_top100 - top21_50 - p_top20).toFixed(2));
  const others    = parseFloat((100 - p_pool - p_top20 - top21_50 - top51_100).toFixed(2));


  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window === "undefined") return;
      if (!window.Chart || !window.ChartDataLabels) return;
      clearInterval(interval);
      try { window.Chart.register(window.ChartDataLabels); } catch (_) {}

      const ctx = document.getElementById("liquidityPie2") as HTMLCanvasElement;
      if (!ctx) return;

      const chart = new window.Chart(ctx, {
        type: "pie",
        data: {
          labels: ["Pool", "Top 1–10", "Top 11–20", "Top 21–50", "Top 51–100", "Others"],
          datasets: [{
            data: [p_pool, top1_10, top11_20, top21_50, top51_100, others],
            backgroundColor: ["#b45309", "#0e9451", "#091c72", "#d45911", "#440283", "#614b4b"],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { bottom: 20 } },
          plugins: {
            legend: {
              position: "bottom",
              align: "center",
              labels: { color: "#94a3b8", padding: 16, font: { size: 12 }, boxWidth: 12 },
            },
            datalabels: { display: false },
          },
        },
      });

      return () => chart.destroy();
    }, 100);

    return () => clearInterval(interval);
  }, [data]);

  const [e_modalChart, e_setModalChart] = useState<number | null>(null);
  const [e_snapcounts, e_setSnapcounts] = useState<Record<number, string>>({});

  // colores sincronizados con METRIC_CONFIG de sec_token_nwallsclust
  const WALLET_COLORS: Record<string, string> = {
    over50000:      "#fbbf24",
    "10000to50000": "#fb923c",
    "5000to10000":  "#f43f5e",
    "1000to5000":   "#a855f7",
    "500to1000":    "#6366f1",
    "100to500":     "#22c55e",
    under100:       "#ef4444",
    over100:        "#2dd4bf",
  };

  // aplana timestamps a objetos planos con todas las keys al mismo nivel
  const flatGlobal = (): any[] => {
    if (!globaldata) return [];
    const flat: any[] = [];
    globaldata.walletblocks.forEach((dayblock: any) => {
      dayblock.timestamps.forEach((t: any) => {
        const point: any = { ts: t.runts };
        const lts = t.liquiditypercent_topscluster || {};
        const wbp = t.walletblocks_percents || {};
        Object.keys(lts).forEach(k => { point[k] = parseFloat(lts[k] || 0); });
        Object.keys(wbp).forEach(k => { point[k] = parseFloat(wbp[k] || 0); });
        flat.push(point);
      });
    });
    flat.sort((a, b) => a.ts - b.ts);
    return flat;
  };

  // reduce puntos planos, conserva picos y cambios >= threshold
  // adaptado de zsatellhub/app/components/a3server/server.html
  const downsample = (data: any[], keys: string[], threshold: number): any[] => {
    if (data.length <= 2) return data;
    const ranges: Record<string, number> = {};
    for (const key of keys) {
      let mn = Infinity;
      let mx = -Infinity;
      for (const row of data) {
        if (row[key] < mn) mn = row[key];
        if (row[key] > mx) mx = row[key];
      }
      ranges[key] = (mx - mn) || 1;
    }
    const result = [data[0]];
    let last = data[0];
    for (let i = 1; i < data.length - 1; i++) {
      let keep = false;
      for (const key of keys) {
        if (Math.abs(data[i][key] - last[key]) / ranges[key] >= threshold) {
          keep = true;
          break;
        }
      }
      if (keep) {
        result.push(data[i]);
        last = data[i];
      }
    }
    result.push(data[data.length - 1]);
    return result;
  };

  const fmtTs = (ts: number) => {
    const d = new Date(ts * 1000);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mn = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm} ${hh}:${mn}`;
  };

  // helper para construir chart options comunes
  const chartOpts = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#94a3b8", font: { size: 11 }, boxWidth: 10 } },
      datalabels: { display: false },
    },
    scales: {
      x: { ticks: { color: "#4b5563", font: { size: 10 }, maxRotation: 45 } },
      y: { ticks: { color: "#4b5563" }, beginAtZero: true },
    },
  });

  // definición de métricas por gráfica (reutilizadas en modal y charts normales).
  // Cada bracket lleva tier+icon marino para que la leyenda del chart sea
  // visualmente distinguible.
  const METRICS_1 = [
    { key: "percent_nholders_over50000",    label: "+$50k",    tier: "WHALE",    icon: "🐋", color: WALLET_COLORS["over50000"] },
    { key: "percent_nholders_10000to50000", label: "$10k–50k", tier: "SHARK",    icon: "🦈", color: WALLET_COLORS["10000to50000"] },
    { key: "percent_nholders_5000to10000",  label: "$5k–10k",  tier: "DOLPHIN",  icon: "🐬", color: WALLET_COLORS["5000to10000"] },
    { key: "percent_nholders_1000to5000",   label: "$1k–5k",   tier: "FISH",     icon: "🐟", color: WALLET_COLORS["1000to5000"] },
    { key: "percent_nholders_500to1000",    label: "$500–1k",  tier: "CRAB",     icon: "🦀", color: WALLET_COLORS["500to1000"] },
    { key: "percent_nholders_100to500",     label: "$100–500", tier: "SHRIMP",   icon: "🦐", color: WALLET_COLORS["100to500"] },
    { key: "percent_nholders_under100",     label: "<$100",    tier: "PLANKTON", icon: "🦠", color: WALLET_COLORS["under100"] },
  ];
  const METRICS_2 = [
    { key: "nholders_over50000",    label: "+$50k",    tier: "WHALE",    icon: "🐋", color: WALLET_COLORS["over50000"] },
    { key: "nholders_10000to50000", label: "$10k–50k", tier: "SHARK",    icon: "🦈", color: WALLET_COLORS["10000to50000"] },
    { key: "nholders_5000to10000",  label: "$5k–10k",  tier: "DOLPHIN",  icon: "🐬", color: WALLET_COLORS["5000to10000"] },
    { key: "nholders_1000to5000",   label: "$1k–5k",   tier: "FISH",     icon: "🐟", color: WALLET_COLORS["1000to5000"] },
    { key: "nholders_500to1000",    label: "$500–1k",  tier: "CRAB",     icon: "🦀", color: WALLET_COLORS["500to1000"] },
    { key: "nholders_100to500",     label: "$100–500", tier: "SHRIMP",   icon: "🦐", color: WALLET_COLORS["100to500"] },
    { key: "nholders_under100",     label: "<$100",    tier: "PLANKTON", icon: "🦠", color: WALLET_COLORS["under100"] },
  ];
  const METRICS_3 = [
    { key: "percent_bigpool",   label: "Pool",       color: "#b45309" },
    { key: "percent_top1_10",   label: "Top 1–10",   color: "#0e9451" },
    { key: "percent_top11_20",  label: "Top 11–20",  color: "#4f83cc" },
    { key: "percent_top21_50",  label: "Top 21–50",  color: "#d45911" },
    { key: "percent_top51_100", label: "Top 51–100", color: "#a855f7" },
    { key: "percent_others",    label: "Others",     color: "#94a3b8" },
  ];
  const CHART_TITLES: Record<number, string> = {
    1: "Holders by % — All Snapshots",
    2: "Holders by Accounts — All Snapshots",
    3: "Liquidity Clusters % — All Snapshots",
  };

  // modal — renderiza la gráfica seleccionada sin downsample
  useEffect(() => {
    if (!e_modalChart || !globaldata) return;
    const metrics = e_modalChart === 1 ? METRICS_1 : e_modalChart === 2 ? METRICS_2 : METRICS_3;
    const interval = setInterval(() => {
      if (typeof window === "undefined" || !window.Chart) return;
      clearInterval(interval);
      const raw = flatGlobal();
      if (raw.length === 0) return;
      const labels = raw.map(p => fmtTs(p.ts));
      const ctx = document.getElementById("demovip_modal_chart") as HTMLCanvasElement;
      if (!ctx) return;
      const chart = new window.Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: metrics.map(m => ({
            label: (m as any).icon ? `${(m as any).icon} ${(m as any).tier} ${m.label}` : m.label,
            data: raw.map(p => p[m.key] ?? 0),
            borderColor: m.color,
            backgroundColor: m.color + "22",
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.25,
            fill: false,
          })),
        },
        options: chartOpts(),
      });
      return () => chart.destroy();
    }, 100);
    return () => clearInterval(interval);
  }, [e_modalChart, globaldata]);

  // gráfica 1 — % holders por bracket (downsample 5%)
  useEffect(() => {
    if (!globaldata) return;
    const interval = setInterval(() => {
      if (typeof window === "undefined" || !window.Chart) return;
      clearInterval(interval);
      const metrics = METRICS_1;

      const raw = flatGlobal();
      if (raw.length === 0) return;
      const flat = downsample(raw, metrics.map(m => m.key), 0.10);
      e_setSnapcounts(prev => ({ ...prev, 1: `${flat.length}/${raw.length}` }));
      const labels = flat.map(p => fmtTs(p.ts));

      const ctx = document.getElementById("demovip_chart1") as HTMLCanvasElement;
      if (!ctx) return;

      const chart = new window.Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: metrics.map(m => ({
            label: (m as any).icon ? `${(m as any).icon} ${(m as any).tier} ${m.label}` : m.label,
            data: flat.map(p => p[m.key] ?? 0),
            borderColor: m.color,
            backgroundColor: m.color + "22",
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.25,
            fill: false,
          })),
        },
        options: chartOpts(),
      });

      return () => chart.destroy();
    }, 150);
    return () => clearInterval(interval);
  }, [globaldata]);

  // gráfica 2 — nholders absolutos por bracket (downsample 5%)
  useEffect(() => {
    if (!globaldata) return;
    const interval = setInterval(() => {
      if (typeof window === "undefined" || !window.Chart) return;
      clearInterval(interval);
      const metrics = METRICS_2;

      const raw = flatGlobal();
      if (raw.length === 0) return;
      const flat = downsample(raw, metrics.map(m => m.key), 0.10);
      e_setSnapcounts(prev => ({ ...prev, 2: `${flat.length}/${raw.length}` }));
      const labels = flat.map(p => fmtTs(p.ts));

      const ctx = document.getElementById("demovip_chart2") as HTMLCanvasElement;
      if (!ctx) return;

      const chart = new window.Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: metrics.map(m => ({
            label: (m as any).icon ? `${(m as any).icon} ${(m as any).tier} ${m.label}` : m.label,
            data: flat.map(p => p[m.key] ?? 0),
            borderColor: m.color,
            backgroundColor: m.color + "22",
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.25,
            fill: false,
          })),
        },
        options: chartOpts(),
      });

      return () => chart.destroy();
    }, 200);
    return () => clearInterval(interval);
  }, [globaldata]);

  // gráfica 3 — evolución clusters de liquidez % (downsample 5%)
  useEffect(() => {
    if (!globaldata) return;
    const interval = setInterval(() => {
      if (typeof window === "undefined" || !window.Chart) return;
      clearInterval(interval);
      const metrics = METRICS_3;

      const raw = flatGlobal();
      if (raw.length === 0) return;
      const flat = downsample(raw, metrics.map(m => m.key), 0.10);
      e_setSnapcounts(prev => ({ ...prev, 3: `${flat.length}/${raw.length}` }));
      const labels = flat.map(p => fmtTs(p.ts));

      const ctx = document.getElementById("demovip_chart3") as HTMLCanvasElement;
      if (!ctx) return;

      const chart = new window.Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: metrics.map(m => ({
            label: (m as any).icon ? `${(m as any).icon} ${(m as any).tier} ${m.label}` : m.label,
            data: flat.map(p => p[m.key] ?? 0),
            borderColor: m.color,
            backgroundColor: m.color + "22",
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.25,
            fill: false,
          })),
        },
        options: chartOpts(),
      });

      return () => chart.destroy();
    }, 250);
    return () => clearInterval(interval);
  }, [globaldata]);

  return (
    <div className="flex flex-col gap-4">

      {/* ── FILA 1: KPIs rápidos — 1 row mobile, 4 col desktop ── */}
      <div className="flex flex-col md:grid md:grid-cols-4 gap-2">
        <div style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="text-xs text-gray-500 m-0">Price</p>
          <p className="text-base font-bold m-0" style={{ color: "#06b6d4" }}>${data.dex_price}</p>
        </div>
        <div style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="text-xs text-gray-500 m-0">Supply deployed</p>
          <p className="text-base font-bold text-white m-0">{Number(data.dex_supply_raw).toLocaleString()}</p>
        </div>
        <div style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="text-xs text-gray-500 m-0">Supply scraped</p>
          <p className="text-base font-bold text-white m-0">{Number(data.indx_supplyfound).toLocaleString()}</p>
        </div>
        <div style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="text-xs text-gray-500 m-0">Amount lost&nbsp;
            <span className="text-xs font-semibold" style={{ color: Number(data.amount_lost) < 0 ? "#f87171" : "#4ade80" }}>
              {data.perc_lost}%
            </span>
          </p>
          <p className="text-base font-bold m-0" style={{ color: Number(data.amount_lost) < 0 ? "#f87171" : "#4ade80" }}>
            {Number(data.amount_lost).toLocaleString()}
          </p>
          
        </div>

      </div>


      {/* ── FILA 2: pie + accs + main pool ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* pie */}
        <div style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "10px", padding: "16px" }}>
          <p className="text-white font-bold mb-3 text-center">Liquidity Distribution</p>
          <div style={{ height: "380px" }}>
            <canvas id="liquidityPie2" style={{ width: "100%", height: "100%" }} />
          </div>
        </div>

        {/* accs distribution */}
        <div style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "10px", padding: "16px" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-white font-bold">Accs Distribution</p>
            <p className="text-white font-bold">Holders: {Number(data.an_nholders_full).toLocaleString()}</p>
          </div>
          <p className="text-xs text-gray-500 mb-3">{data.an_perc_nholders_full}% supply found</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(() => {
              // localiza el penultimo snap cronologicamente para calcular deltas
              let prevSnap: any = null;
              if (globaldata?.walletblocks) {
                const allTs: any[] = [];
                for (const dayb of globaldata.walletblocks) {
                  for (const tt of (dayb.timestamps || [])) allTs.push(tt);
                }
                allTs.sort((a, b) => Number(a.runts) - Number(b.runts));
                if (allTs.length >= 2) prevSnap = allTs[allTs.length - 2];
              }
              const getPrev = (k: string): number | null => {
                if (!prevSnap) return null;
                const wb = prevSnap.walletblocks || prevSnap.liquiditypercent_topscluster || {};
                const v = wb[`nholders_${k}`];
                return v != null && v !== "" ? Number(v) : null;
              };

              const items = [
                { letter: "A", tier: "WHALE", icon: "🐋", key: "over50000",    range: "+$50,000",      val: data.an_nholders_over50000,    perc: data.an_perc_nholders_over50000,    color: "#fbbf24", tokSum: data.an_tokens_sum_over50000,    usdMin: 50000, usdMax: null  },
                { letter: "B", tier: "SHARK",       icon: "🦈", key: "10000to50000", range: "+$10k – $50k",  val: data.an_nholders_10000to50000, perc: data.an_perc_nholders_10000to50000, color: "#fb923c", tokSum: data.an_tokens_sum_10000to50000, usdMin: 10000, usdMax: 50000 },
                { letter: "C", tier: "DOLPHIN",     icon: "🐬", key: "5000to10000",  range: "+$5k – $10k",   val: data.an_nholders_5000to10000,  perc: data.an_perc_nholders_5000to10000,  color: "#f43f5e", tokSum: data.an_tokens_sum_5000to10000,  usdMin: 5000,  usdMax: 10000 },
                { letter: "D", tier: "FISH",        icon: "🐟", key: "1000to5000",   range: "+$1k – $5k",    val: data.an_nholders_1000to5000,   perc: data.an_perc_nholders_1000to5000,   color: "#a855f7", tokSum: data.an_tokens_sum_1000to5000,   usdMin: 1000,  usdMax: 5000  },
                { letter: "E", tier: "CRAB",        icon: "🦀", key: "500to1000",    range: "+$500 – $1k",   val: data.an_nholders_500to1000,    perc: data.an_perc_nholders_500to1000,    color: "#6366f1", tokSum: data.an_tokens_sum_500to1000,    usdMin: 500,   usdMax: 1000  },
                { letter: "F", tier: "SHRIMP",      icon: "🦐", key: "100to500",     range: "+$100 – $500",  val: data.an_nholders_100to500,     perc: data.an_perc_nholders_100to500,     color: "#22c55e", tokSum: data.an_tokens_sum_100to500,     usdMin: 100,   usdMax: 500   },
                { letter: "X", tier: "PLANKTON",    icon: "🦠", key: "under100",     range: "under $100",    val: data.an_nholders_under100,     perc: data.an_perc_nholders_under100,     color: "#ef4444", tokSum: data.an_tokens_sum_under100,     usdMin: 0,     usdMax: 100   },
              ];

              // Precio del snapshot para convertir USD → tokens
              const snapPrice = parseFloat((data as any).dex_price ?? 0);

              // Formatea cantidad de tokens con sufijo K/M/B
              const fmtTok = (n: number): string => {
                if (!n || n <= 0) return "—";
                if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
                if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
                if (n >= 1_000)         return `${(n / 1_000).toFixed(2)}k`;
                return Math.round(n).toLocaleString();
              };

              return items.map((item) => {
                const cur = Number(item.val) || 0;
                const prev = getPrev(item.key);
                const delta = prev != null ? cur - prev : null;
                let deltaStr = "";
                let deltaColor = "#475569";
                if (delta != null) {
                  if (delta > 0)      { deltaStr = `[+${delta.toLocaleString()}]`; deltaColor = "#4ade80"; }
                  else if (delta < 0) { deltaStr = `[${delta.toLocaleString()}]`;  deltaColor = "#f87171"; }
                  else                { deltaStr = `[0]`;                          deltaColor = "#94a3b8"; }
                }
                return (
              <div
                key={item.letter}
                style={{
                  background: "#0a0e1a",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  border: "1px solid #1e293b",
                  borderTopWidth: "2px",
                  borderTopColor: item.color,
                }}
              >
                {/* fila superior: badge letra + icono marino + rango USD */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        background: item.color + "22",
                        color: item.color,
                        borderRadius: "4px",
                        padding: "1px 7px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        letterSpacing: "0.10em",
                      }}
                    >
                      {item.letter}
                    </span>
                    <span style={{ fontSize: "16px", lineHeight: 1 }}>{item.icon}</span>
                  </div>
                  <span
                    style={{
                      color: item.color,
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {item.range}
                  </span>
                </div>

                {/* tier marino — subtitulo arriba del numero grande */}
                <p
                  style={{
                    color: item.color,
                    fontFamily: "monospace",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textAlign: "center",
                    marginBottom: "4px",
                    opacity: 0.85,
                  }}
                >
                  {item.tier}
                </p>

                {/* número grande */}
                <p style={{ color: item.color, fontWeight: "bold", fontSize: "22px", lineHeight: 1, marginBottom: "4px", textAlign: "center" }}>
                  {Number(item.val).toLocaleString()}
                </p>

                {/* delta vs penultimo snap */}
                {deltaStr && (
                  <p style={{ color: deltaColor, fontFamily: "monospace", fontSize: "10px", fontWeight: 700, textAlign: "center", marginBottom: "4px" }}>
                    {deltaStr}
                  </p>
                )}

                {/* barra de progreso */}
                <div style={{ background: "#1e293b", borderRadius: "2px", height: "3px", marginBottom: "5px" }}>
                  <div
                    style={{
                      background: "#4ade80",
                      borderRadius: "2px",
                      height: "3px",
                      width: `${Math.min(parseFloat(String(item.perc)) * 4, 100)}%`,
                      opacity: 0.6,
                    }}
                  />
                </div>

                {/* porcentaje */}
                <p style={{ color: "#ffffff", fontSize: "13px", fontWeight: "bold", textAlign: "center" }}>{item.perc}%</p>

                {/* rango de tokens equivalente al rango USD al precio del snap */}
                <p style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "10px", textAlign: "center", marginTop: "2px", marginBottom: 0 }}>
                  {(() => {
                    if (!snapPrice || snapPrice <= 0) return "—";
                    // bracket abierto por arriba: ≥ min
                    if (item.usdMax == null) return `≥ ${fmtTok(item.usdMin / snapPrice)} tk`;
                    // bracket abierto por abajo: < max
                    if (item.usdMin === 0)   return `< ${fmtTok(item.usdMax / snapPrice)} tk`;
                    // bracket cerrado: min tk – max tk
                    return `${fmtTok(item.usdMin / snapPrice)} – ${fmtTok(item.usdMax / snapPrice)} tk`;
                  })()}
                </p>
              </div>
                );
              });
            })()}
          </div>
        </div>

        {/* tokens distribution — col 3 (al lado de accs distribution) */}
        <div style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "10px", padding: "16px" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-bold">Tokens Distribution</p>
          </div>

          {/* $100 threshold — single row: label + tokens equivalentes + price */}
          {(() => {
            const price = parseFloat((data as any).dex_price ?? 0);
            if (!price || price <= 0) return null;
            const tokensFor100usd = 100 / price;

            const fmt = (n: number) => {
              if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
              if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
              if (n >= 1_000)         return `${(n / 1_000).toFixed(2)}k`;
              if (n >= 1)             return n.toFixed(2);
              return n.toFixed(4);
            };

            return (
              <div className="mb-3 px-3 py-2 rounded flex items-center flex-wrap gap-x-2" style={{ background: "#0a0e1a", border: "1px solid rgba(34,211,238,0.25)" }}>
                <span className="text-xs text-gray-500">$100 threshold</span>
                <span className="font-bold text-sm" style={{ color: "#22d3ee" }}>
                  ≈ {fmt(tokensFor100usd)} tokens
                </span>
                <span className="text-xs text-gray-500 font-normal">
                  @ ${price.toFixed(price < 0.01 ? 8 : 6).replace(/0+$/, "").replace(/\.$/, "")}
                </span>
              </div>
            );
          })()}

          {/* 2 barras over/under $100 — split por valor en USD usando dex_price del snap */}
          {(() => {
            const overN  = parseInt((data as any).an_nholders_over100  ?? 0);
            const underN = parseInt((data as any).an_nholders_under100 ?? 0);
            const totUsd = overN + underN;
            if (totUsd === 0) return null;
            const maxN   = Math.max(overN, underN) || 1;
            const rows = [
              { key: "over",  label: "over $100",  count: overN,  color: "#4ade80" },
              { key: "under", label: "under $100", count: underN, color: "#f87171" },
            ];
            return (
              <div className="mb-3 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex flex-col gap-2">
                  {rows.map(r => {
                    const widthPct = (r.count / maxN) * 100;
                    return (
                      <div key={r.key} className="grid items-center gap-2" style={{ gridTemplateColumns: "78px 1fr 60px" }}>
                        <span style={{ color: r.color, fontFamily: "monospace", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {r.label}
                        </span>
                        <div style={{ position: "relative", height: 16, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.max(0.5, widthPct)}%`, height: "100%", background: r.color, opacity: 0.85, borderRadius: 3, transition: "width 0.3s" }} />
                        </div>
                        <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: "0.72rem", fontWeight: 700, textAlign: "right" }}>
                          {r.count.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {(() => {
            const TOKEN_BRACKETS = [
              { key: "over100M",  label: "+100M",      color: "#fbbf24" },
              { key: "10Mto100M", label: "10M – 100M", color: "#fb923c" },
              { key: "5Mto10M",   label: "5M – 10M",   color: "#f43f5e" },
              { key: "1Mto5M",    label: "1M – 5M",    color: "#a855f7" },
              { key: "100kto1M",  label: "100k – 1M",  color: "#6366f1" },
              { key: "10kto100k", label: "10k – 100k", color: "#22c55e" },
              { key: "1kto10k",   label: "1k – 10k",   color: "#06b6d4" },
              { key: "100to1k",   label: "100 – 1k",   color: "#94a3b8" },
            ];
            const rows = TOKEN_BRACKETS.map(b => {
              const count = parseInt((data as any)[`an_nholders_tokens_${b.key}`] ?? 0);
              const perc  = parseFloat((data as any)[`an_perc_nholders_tokens_${b.key}`] ?? 0);
              return { ...b, count, perc };
            });
            const total = rows.reduce((acc, r) => acc + r.count, 0);
            const maxCount = Math.max(...rows.map(r => r.count)) || 1;
            if (total === 0) {
              return <p className="text-gray-500 text-sm">no data yet</p>;
            }
            return (
              <div className="flex flex-col gap-2">
                {rows.map(r => {
                  const widthPct = (r.count / maxCount) * 100;
                  return (
                    <div key={r.key} className="grid items-center gap-2" style={{ gridTemplateColumns: "78px 1fr 60px" }}>
                      <span style={{ color: r.color, fontFamily: "monospace", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {r.label}
                      </span>
                      <div style={{ position: "relative", height: 16, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(0.5, widthPct)}%`, height: "100%", background: r.color, opacity: 0.85, borderRadius: 3, transition: "width 0.3s" }} />
                      </div>
                      <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: "0.72rem", fontWeight: 700, textAlign: "right" }}>
                        {r.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-500 mt-2 mb-0">
                  total ≥100: <span className="text-cyan-300 font-bold">{total.toLocaleString()}</span> · wallets &lt;100 excluded
                </p>
              </div>
            );
          })()}
        </div>

      </div>

      {/* Marine Distribution eliminado 11-may-26: los tiers marinos ahora viven
          en cada card de Accs Distribution (con icono + nombre del tier),
          no como bloque separado. */}

      {/* ── FILA 3: main pool + top pools (2 cols desktop) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* main pool — fila 3 col 1 */}
        <div style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "10px", padding: "16px" }}>
          <p className="text-white font-bold mb-3">Main Pool Found</p>
          {data.dex_main_pool_found ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">DEX</p>
                  <p className="font-bold" style={{ color: "#4ade80" }}>
                    {data.dex_main_pool_found.dexId?.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Liquidity USD</p>
                  <p className="font-bold" style={{ color: "#facc15" }}>
                    ${data.dex_main_pool_found.liq_usd}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div style={{ background: "#0a0e1a", borderRadius: "6px", padding: "8px" }}>
                  <p className="text-xs text-gray-500">Liq Base</p>
                  <p className="font-bold text-sm text-blue-300">{data.dex_main_pool_found.liq_base}</p>
                </div>
                <div style={{ background: "#0a0e1a", borderRadius: "6px", padding: "8px" }}>
                  <p className="text-xs text-gray-500">Liq Quote</p>
                  <p className="font-bold text-sm text-purple-300">{data.dex_main_pool_found.liq_quote}</p>
                </div>
                <div style={{ background: "#0a0e1a", borderRadius: "6px", padding: "8px" }}>
                  <p className="text-xs text-gray-500">Base Token</p>
                  <p className="font-bold text-sm text-gray-200">{data.name}</p>
                </div>
                <div style={{ background: "#0a0e1a", borderRadius: "6px", padding: "8px" }}>
                  <p className="text-xs text-gray-500">Quote Token</p>
                  <p className="font-bold text-sm text-gray-200">{data.dex_main_pool_found.quotetoken_symbol}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">{data.dex_main_pool_found.createdAt_formatted}</p>
                <button
                  onClick={() => window.open(`https://solscan.io/account/${data.dex_main_pool_found.pool_address}`, "_blank")}
                  className="text-xs font-bold px-3 py-1 rounded"
                  style={{ background: "#0891b2", color: "#fff" }}
                >
                  Solscan →
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No main pool found</p>
          )}
        </div>

        {/* top pools — fila 3 col 2 */}
        <div style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "10px", padding: "16px" }}>
          <p className="text-white font-bold mb-3">
            Top Pools (High) +$5,000 USD
          </p>
          {data.dex_full_info?.pools_high?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e3a4a" }}>
                    {["#", "DEX", "Liq USD", "Liq Base", "Liq Quote", "$Base", "$Quote", "Created", ""].map((h) => (
                      <th
                        key={h}
                        className="text-center py-2 px-2 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                        style={{ color: "#ffffff" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.dex_full_info.pools_high.slice(0, 10).map((pool: any, idx: number) => (
                    <tr
                      key={idx}
                      style={{ borderBottom: "1px solid #111827" }}
                      className="hover:bg-[#0d1520] transition-colors"
                    >
                      <td className="py-2 px-2 text-gray-500 text-xs">{pool.idx}</td>
                      <td className="py-2 px-2 font-bold text-xs" style={{ color: "#06b6d4" }}>
                        {pool.dexId?.toUpperCase()}
                      </td>
                      <td className="py-2 px-2 font-bold text-xs" style={{ color: "#facc15" }}>
                        ${pool.liq_usd}
                      </td>
                      <td className="py-2 px-2 text-gray-300 text-xs">{pool.liq_base}</td>
                      <td className="py-2 px-2 text-gray-300 text-xs">{pool.liq_quote}</td>
                      <td className="py-2 px-2 text-gray-300 text-xs">${pool.calc_base_value}</td>
                      <td className="py-2 px-2 text-gray-300 text-xs">${pool.calc_quote_value}</td>
                      <td className="py-2 px-2 text-gray-500 text-xs whitespace-nowrap">{pool.createdAt_formatted}</td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => window.open(`https://solscan.io/account/${pool.pool_address}`, "_blank")}
                          className="text-xs px-2 py-1 rounded font-semibold"
                          style={{ background: "#0891b2", color: "#fff" }}
                        >
                          →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No high pools available</p>
          )}
        </div>

      </div>

      {/* ── FILA 4: gráficas históricas ── */}
      {globaldata && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {([
            { n: 1, id: "demovip_chart1", title: "Holders by % — History" },
            { n: 2, id: "demovip_chart2", title: "Holders by Accounts — History" },
            { n: 3, id: "demovip_chart3", title: "Liquidity Clusters % — History" },
          ] as { n: number; id: string; title: string }[]).map(({ n, id, title }) => (
            <div key={n} style={{ background: "#0f1623", border: "1px solid #164e63", borderRadius: "10px", padding: "16px" }}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-white font-bold text-sm">{title}</p>
                  {e_snapcounts[n] && (
                    <p className="text-white font-bold text-xs mt-0.5">{e_snapcounts[n]} snaps</p>
                  )}
                </div>
                <button
                  onClick={() => e_setModalChart(n)}
                  className="text-xs font-semibold px-2 py-1 rounded"
                  style={{ background: "#0c3044", color: "#38bdf8", border: "1px solid #164e63" }}
                >
                  View all snapshots
                </button>
              </div>
              <div style={{ height: "280px" }}>
                <canvas id={id} style={{ width: "100%", height: "100%" }} />
              </div>
            </div>
          ))}

        </div>
      )}

      {/* ── MODAL: gráfica expandida sin downsample ── */}
      {e_modalChart && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => e_setModalChart(null)}
        >
          <div
            style={{
              background: "#0a0e1a",
              border: "1px solid #164e63",
              borderRadius: "12px",
              padding: "24px",
              width: "100%",
              maxWidth: "1200px",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold text-base">{CHART_TITLES[e_modalChart]}</p>
              <button
                onClick={() => e_setModalChart(null)}
                className="text-gray-400 font-bold text-xl leading-none"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
            <div style={{ height: "480px" }}>
              <canvas id="demovip_modal_chart" style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
