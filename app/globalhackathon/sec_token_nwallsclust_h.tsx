"use client";

import { useEffect } from "react";

interface Props {
	token: string;
	globaldata: any;
}

// retorna índices a conservar con cambio relativo >= threshold
function downsampleIdx(values: number[], threshold: number): number[] {
	if (values.length <= 2) return values.map((_, i) => i);
	const range = Math.max(...values) - Math.min(...values);
	const minChange = range * threshold;
	const kept: number[] = [0];
	let lastVal = values[0];
	for (let i = 1; i < values.length - 1; i++) {
		if (Math.abs(values[i] - lastVal) >= minChange) {
			kept.push(i);
			lastVal = values[i];
		}
	}
	kept.push(values.length - 1);
	return [...new Set(kept)].sort((a, b) => a - b);
}

export default function Sec_nwallsclust_h({ token, globaldata }: Props) {

	// CONFIG — activar/desactivar lo que quieras. tier+icon sincronizados con
	// sec_datatext_vip2 / sec_historygrowth / sec_historygraphs / global page.
	const METRIC_CONFIG: any = {
		nholders_full:          { enabled: false,  color: "#00e1ff", tier: "FULL",     icon: "🌊", range: "all"        },
		nholders_over100:       { enabled: true,   color: "#2dd4bf", tier: "+FISH",    icon: "🐠", range: "+$100"      },
		nholders_over50000:     { enabled: true,   color: "#fbbf24", tier: "WHALE",    icon: "🐋", range: "+$50k"      },
		nholders_10000to50000:  { enabled: true,   color: "#fb923c", tier: "SHARK",    icon: "🦈", range: "$10k-50k"   },
		nholders_5000to10000:   { enabled: true,   color: "#f43f5e", tier: "DOLPHIN",  icon: "🐬", range: "$5k-10k"    },
		nholders_1000to5000:    { enabled: true,   color: "#a855f7", tier: "FISH",     icon: "🐟", range: "$1k-5k"     },
		nholders_500to1000:     { enabled: true,   color: "#6366f1", tier: "CRAB",     icon: "🦀", range: "$500-1k"    },
		nholders_100to500:      { enabled: true,   color: "#22c55e", tier: "SHRIMP",   icon: "🦐", range: "$100-500"   },
		nholders_under100:      { enabled: false,  color: "#ef4444", tier: "PLANKTON", icon: "🦠", range: "<$100"      },
	};

	useEffect(() => {

		let interval = setInterval(() => {
			if (!globaldata?.walletblocks) return;
			if (typeof window === "undefined" || !window.Chart) return;

			clearInterval(interval);

			// ============================================================
			// 1) FLATTEN usando runts + pages
			// ============================================================
			const flat: any[] = [];

			globaldata.walletblocks.forEach((dayblock: any) => {
				dayblock.timestamps.forEach((t: any) => {

					const run = Number(t.runts || t.ts);
					if (isNaN(run)) return;

					flat.push({
						ts: run,
						pages: t.pages ?? 0, // 🔥 agregado
						...t.walletblocks
					});
				});
			});

			// ordenar por corrida
			flat.sort((a, b) => a.ts - b.ts);

			// ============================================================
			// 2) Downsample: unión de índices significativos por métrica
			// ============================================================
			const enabledMetrics = Object.keys(METRIC_CONFIG).filter(m => METRIC_CONFIG[m].enabled);
			const keepSets = enabledMetrics.map(m => {
				const vals = flat.map(p => Number(p[m]) || 0);
				return new Set(downsampleIdx(vals, 0.10));
			});
			const keptIdx = Array.from(
				enabledMetrics.reduce((acc, _, i) => {
					keepSets[i].forEach(idx => acc.add(idx));
					return acc;
				}, new Set<number>())
			).sort((a, b) => a - b);

			const filteredFlat = keptIdx.map(i => flat[i]);

			// Labels reales → fecha + pages
			const labels = filteredFlat.map(p => {
				const date = new Date(p.ts * 1000).toLocaleString("es-MX", {
					day: "2-digit",
					month: "2-digit",
					hour: "2-digit",
					minute: "2-digit"
				});
				return [date, `p${p.pages}`];
			});

			// ============================================================
			// 3) Dataset dinámico
			// ============================================================
			const datasets: any[] = [];

			for (const metric in METRIC_CONFIG) {

				if (!METRIC_CONFIG[metric].enabled) continue;

				datasets.push({
					label: `${METRIC_CONFIG[metric].icon} ${METRIC_CONFIG[metric].tier} ${METRIC_CONFIG[metric].range}`,
					data: filteredFlat.map(p => Number(p[metric]) || 0),
					borderColor: METRIC_CONFIG[metric].color,
					borderWidth: 2,
					pointRadius: 4,
					pointHoverRadius: 7,
					tension: 0.25,
					fill: false
				});
			}

			// ============================================================
			// 4) Render Chart.js
			// ============================================================
			const id = `walletLine_${token}`;
			const canvas = document.getElementById(id) as HTMLCanvasElement;
			if (!canvas) return;

			const chart = new window.Chart(canvas, {
				type: "line",
				data: {
					labels,
					datasets
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							labels: { color: "#fff", font: { size: 11 } }
						},
						tooltip: {
							titleColor: "#fff",
							bodyColor: "#fff",
							backgroundColor: "rgba(0,0,0,0.7)",
							callbacks: {
								title: (ctx: any) => {
									const lbl = labels[ctx[0].dataIndex];
									return Array.isArray(lbl) ? lbl.join(" ") : lbl;
								}
							}
						}
					},
					scales: {
						x: { ticks: { color: "#bbb" } },
						y: { ticks: { color: "#bbb" } }
					}
				}
			});

			return () => chart.destroy();

		}, 120);

		return () => clearInterval(interval);

	}, [token, globaldata]);

	return (
		<div style={{
			background: "#0d1117",
			border: "1px solid #1e293b",
			borderRadius: 12,
			padding: "20px 20px 16px",
			marginTop: 24,
		}}>
			<h3 style={{
				color: "#e2e8f0", fontFamily: "'Press Start 2P', monospace", fontWeight: 700,
				fontSize: "11px", margin: "0 0 16px 0", textAlign: "center", letterSpacing: "0.06em",
			}}>
				{token.toUpperCase()} — Holders by Accounts
			</h3>

			<div style={{ height: "450px", width: "100%" }}>
				<canvas id={`walletLine_${token}`}></canvas>
			</div>
		</div>
	);
}
