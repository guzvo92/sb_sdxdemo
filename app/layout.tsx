import type { Metadata } from "next";
import "./globals.css";
import AppWalletProvider from "./components/AppWalletProvider";

export const metadata: Metadata = {
  title: "SatellDex Demo",
  description: "Solana holder intelligence demo · Colosseum Frontier 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        {/* Chart.js via CDN — usado por /global y /hackathonview. Sin npm dep.
            Plugin datalabels lo usa sec_datatext_hackathon para labels en pies. */}
        <script src="https://cdn.jsdelivr.net/npm/chart.js" async></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2" async></script>
      </head>
      <body>
        <AppWalletProvider>{children}</AppWalletProvider>
      </body>
    </html>
  );
}
