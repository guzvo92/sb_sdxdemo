// declaracion global de Chart.js cargado via CDN en el layout
export {};

declare global {
  interface Window {
    Chart: any;
  }
}
