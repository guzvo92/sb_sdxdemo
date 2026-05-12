"use client";

// Card del "Node" central con frame holografico, esquinas cyberpunk
// y scan line animada. Imagen viene desde /public/assets/Node.png
// (servida estatica por Next, no se importa como module).

import React from "react";
import Image from "next/image";

export default function SecHexnode() {
  return (
    <section
      style={{
        width: "100%",
        background: "#000",
        padding: "64px 24px 72px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "36px",
        borderBottom: "1px solid rgba(6,182,212,0.1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* glow central de fondo */}
      <div aria-hidden style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* eyebrow */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        position: "relative", zIndex: 1,
      }}>
        <span style={{ display:"inline-block", width:"24px", height:"1px",
          background:"linear-gradient(90deg,transparent,var(--accent))" }} />
        <span style={{ fontFamily:"monospace", fontSize:"9px", letterSpacing:"0.3em",
          color:"var(--accent)", textTransform:"uppercase" }}>
          INFRASTRUCTURE NODE
        </span>
        <span style={{ display:"inline-block", width:"24px", height:"1px",
          background:"linear-gradient(270deg,transparent,var(--accent))" }} />
      </div>

      {/* frame holografico */}
      <div style={{
        position: "relative", zIndex: 1,
        border: "2px solid var(--accent)",
        borderRadius: "10px",
        boxShadow: "0 0 50px rgba(6,182,212,0.18), 0 0 100px rgba(6,182,212,0.06)",
      }}>
        <div style={{
          background: "transparent",
          borderRadius: "8px",
          width: "280px",
          height: "280px",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Corner pos="top-left" />
          <Corner pos="top-right" />
          <Corner pos="bottom-left" />
          <Corner pos="bottom-right" />

          {/* imagen del nodo servida desde /public/assets/ */}
          <Image
            src="/assets/Node.png"
            alt="Node"
            fill
            sizes="280px"
            style={{ objectFit: "contain", padding: "16px", mixBlendMode: "screen" }}
            priority
          />

          {/* scan line animada */}
          <div aria-hidden style={{
            position: "absolute", left: 0, right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
            opacity: 0.5,
            animation: "hexnode-scan 3.5s linear infinite",
            zIndex: 3,
            pointerEvents: "none",
          }} />

          <div style={{
            position: "absolute", bottom: "8px", right: "10px",
            fontFamily: "monospace", fontSize: "8px",
            color: "var(--accent)", letterSpacing: "0.15em",
            opacity: 0.7, zIndex: 4,
          }}>
            NODE / ACTIVE
          </div>
        </div>
      </div>

      {/* leyenda */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        textAlign: "center",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"40px", height:"1px",
            background:"linear-gradient(90deg,transparent,rgba(6,182,212,0.5))" }} />
          <span style={{ fontFamily:"monospace", fontSize:"9px",
            color:"rgba(6,182,212,0.5)", letterSpacing:"0.2em" }}>NODE / 01</span>
          <div style={{ width:"40px", height:"1px",
            background:"linear-gradient(270deg,transparent,rgba(6,182,212,0.5))" }} />
        </div>
        <h3 style={{
          fontFamily: "monospace",
          fontSize: "clamp(16px, 2vw, 22px)",
          fontWeight: "800",
          color: "#f0f6ff",
          letterSpacing: "0.05em",
          margin: 0,
        }}>
          Delicated Data Node — 24/7 Active
        </h3>
      </div>

      <style>{`
        @keyframes hexnode-scan {
          0%   { top: -2px; }
          100% { top: 102%; }
        }
      `}</style>
    </section>
  );
}

// Esquinas cyberpunk del frame del nodo.
function Corner({ pos }: { pos: "top-left"|"top-right"|"bottom-left"|"bottom-right" }) {
  const size = 16;
  const offset = 7;
  const style: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    zIndex: 4,
    ...(pos === "top-left"     && { top: offset, left: offset,
      borderTop: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)" }),
    ...(pos === "top-right"    && { top: offset, right: offset,
      borderTop: "2px solid var(--accent)", borderRight: "2px solid var(--accent)" }),
    ...(pos === "bottom-left"  && { bottom: offset, left: offset,
      borderBottom: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)" }),
    ...(pos === "bottom-right" && { bottom: offset, right: offset,
      borderBottom: "2px solid var(--accent)", borderRight: "2px solid var(--accent)" }),
  };
  return <div style={style} />;
}
