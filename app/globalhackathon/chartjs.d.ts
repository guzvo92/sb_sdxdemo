// Type declaration global para window.Chart + window.ChartDataLabels
// (Chart.js + plugin de datalabels cargados via CDN, no via npm).
declare global {
  interface Window {
    Chart: any;
    ChartDataLabels?: any;
  }
}
export {};
