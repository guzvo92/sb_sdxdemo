"use client";

import { slicetext } from "../utils/generalutils";

interface Holder2 {
  idx: number;
  owner: string;
  amount: number;
  percentage_of_total_supply: number;
  value_today: number;
  has_mainpool: boolean | string;
  lookas_mainpool: boolean | string;
}

interface Props {
  holders: Holder2[];
  querytime_ms?: number | null;
  selected_mode?: string | null;
}

export default function HoldersTable_hackathon({ holders, querytime_ms, selected_mode }: Props) {
  return (
    <div>

      {/* metadata */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span
          className="text-xs font-semibold px-2 py-1 rounded"
          style={{ background: "#164e63", color: "#67e8f9" }}
        >
          {holders.length} rows
        </span>

        {selected_mode == null ? (
          <span className="text-gray-600 text-xs">Select pending</span>
        ) : (
          <span className="text-xs font-semibold" style={{ color: "#06b6d4" }}>
            Mode: {selected_mode}
          </span>
        )}

        {querytime_ms != null && (
          <span className="text-gray-500 text-xs">{querytime_ms} ms</span>
        )}

        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#065f46" }} />
          Main Pool
        </span>
      </div>

      {/* mobile: 3 cols — Owner(#) | % + Amount | Value, conserva bg verde main_pool */}
      <div className="flex flex-col md:hidden" style={{ borderTop: "1px solid #1e3a4a", borderRadius: "8px", overflow: "hidden", border: "1px solid #1e3a4a" }}>
        <div style={{ background: "#0d1520", borderBottom: "1px solid #1e3a4a", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ flex: 1, fontFamily: "monospace", fontSize: "10px", color: "#475569", fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: ".05em" }}>Owner</span>
          <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#475569", fontWeight: 700, whiteSpace: "nowrap", minWidth: "80px", textAlign: "center", textTransform: "uppercase", letterSpacing: ".05em" }}>% / Amount</span>
          <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#475569", fontWeight: 700, whiteSpace: "nowrap", minWidth: "60px", textAlign: "center", textTransform: "uppercase", letterSpacing: ".05em" }}>Value</span>
        </div>

        {holders.length === 0 && (
          <div style={{ padding: "40px 8px", textAlign: "center", color: "#fff", fontWeight: 700, background: "#0a0e1a" }}>
            Select a query mode to load holders
          </div>
        )}

        {holders.map((h) => {
          const isLap = h.lookas_mainpool === true;
          return (
            <div
              key={`${h.idx}-${h.owner}`}
              style={{
                borderBottom: "1px solid #111827",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: isLap ? "#052e16" : "#0a0e1a",
              }}
            >
              <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>{h.idx} </span>
                <a
                  href={`https://solscan.io/account/${h.owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "monospace", fontSize: "11px", color: "#38bdf8" }}
                >
                  {slicetext(h.owner)}
                </a>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", whiteSpace: "nowrap", minWidth: "80px" }}>
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#d1d5db", fontWeight: 700 }}>{h.percentage_of_total_supply}%</span>
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#d1d5db" }}>{h.amount.toLocaleString()}</span>
              </div>
              <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#4ade80", fontWeight: 600, whiteSpace: "nowrap", minWidth: "60px", textAlign: "center" }}>
                {h.value_today.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })}
      </div>

      {/* desktop: tabla 5 cols original */}
      <div className="hidden md:block overflow-x-auto" style={{ borderRadius: "8px", border: "1px solid #1e3a4a" }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0d1520", borderBottom: "1px solid #1e3a4a" }}>
              {["#", "Owner", "Amount", "% Supply", "Value Today"].map((h) => (
                <th
                  key={h}
                  className="py-3 px-3 text-center text-xs md:text-sm font-semibold uppercase tracking-wide"
                  style={{ color: "#475569", whiteSpace: "nowrap" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {holders.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-lg font-bold text-white">
                  Select a query mode to load holders
                </td>
              </tr>
            )}

            {holders.map((h) => {
              const isLap = h.lookas_mainpool === true;
              return (
                <tr
                  key={`${h.idx}-${h.owner}`}
                  style={{
                    background: isLap ? "#052e16" : "#0a0e1a",
                    borderBottom: "1px solid #111827",
                  }}
                  className="hover:brightness-125 transition-all"
                >
                  <td className="py-2 px-3 text-center text-xs md:text-sm text-gray-500">{h.idx}</td>

                  <td className="py-2 px-3 text-center">
                    <a
                      href={`https://solscan.io/account/${h.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs md:text-sm"
                      style={{ color: "#38bdf8" }}
                    >
                      {slicetext(h.owner)}
                    </a>
                  </td>

                  <td className="py-2 px-3 text-center text-xs md:text-sm font-mono text-gray-300">
                    {h.amount.toLocaleString()}
                  </td>

                  <td className="py-2 px-3 text-center text-xs md:text-sm text-gray-300">
                    {h.percentage_of_total_supply}%
                  </td>

                  <td className="py-2 px-3 text-center font-semibold text-xs md:text-sm" style={{ color: "#4ade80", whiteSpace: "nowrap" }}>
                    {h.value_today.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
