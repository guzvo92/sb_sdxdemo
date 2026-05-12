// declaracion global de Chart.js + plugin datalabels cargados via CDN en
// el layout. Usados por /global y /hackathonview.
export {};

declare global {
  interface Window {
    Chart: any;
    ChartDataLabels: any;
  }
}
