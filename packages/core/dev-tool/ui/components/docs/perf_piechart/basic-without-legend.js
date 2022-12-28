import * as PerfUI from "../../../legacy/components/perf_ui/perf_ui.js";
const chart = new PerfUI.PieChart.PieChart();
document.getElementById("container")?.appendChild(chart);
chart.data = {
  chartName: "Nice Chart",
  size: 110,
  formatter: (value) => String(value) + " %",
  showLegend: false,
  total: 100,
  slices: [{ value: 75, color: "crimson", title: "Filling" }, { value: 25, color: "burlywood", title: "Crust" }]
};
//# sourceMappingURL=basic-without-legend.js.map
