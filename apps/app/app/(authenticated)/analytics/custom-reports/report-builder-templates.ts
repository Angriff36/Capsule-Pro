import type { ReportBuilderTemplate } from "./report-builder-utils";

export const REPORT_BUILDER_TEMPLATES: ReportBuilderTemplate[] = [
  {
    id: "ops-overview",
    name: "Ops Overview",
    description: "Revenue snapshot, trendline, and open issues table.",
    dataSource: "events",
    layout: { columns: 2, gap: "md" },
    widgets: [
      {
        id: "ops-revenue-kpi",
        type: "kpi",
        title: "Weekly Revenue",
        metric: "revenue",
        chartType: "number",
      },
      {
        id: "ops-event-trend",
        type: "line",
        title: "Event Volume Trend",
        metric: "events",
        chartType: "line",
      },
      {
        id: "ops-risk-table",
        type: "table",
        title: "At-Risk Events",
        metric: "risk_events",
        chartType: "table",
      },
    ],
  },
  {
    id: "kitchen-efficiency",
    name: "Kitchen Efficiency",
    description: "Waste, prep throughput, and staffing utilization.",
    dataSource: "kitchen",
    layout: { columns: 3, gap: "md" },
    widgets: [
      {
        id: "kitchen-waste-kpi",
        type: "kpi",
        title: "Waste Cost",
        metric: "waste_cost",
        chartType: "number",
      },
      {
        id: "kitchen-throughput",
        type: "bar",
        title: "Prep Throughput",
        metric: "prep_volume",
        chartType: "bar",
      },
      {
        id: "kitchen-staffing",
        type: "line",
        title: "Staffing Utilization",
        metric: "labor_utilization",
        chartType: "area",
      },
    ],
  },
  {
    id: "finance-pulse",
    name: "Finance Pulse",
    description: "Margin, COGS trend, and receivables watchlist.",
    dataSource: "finance",
    layout: { columns: 2, gap: "lg" },
    widgets: [
      {
        id: "finance-margin",
        type: "kpi",
        title: "Gross Margin",
        metric: "gross_margin",
        chartType: "number",
      },
      {
        id: "finance-cogs",
        type: "line",
        title: "COGS Trend",
        metric: "cogs_pct",
        chartType: "line",
      },
      {
        id: "finance-ar",
        type: "table",
        title: "A/R Aging",
        metric: "aging_report",
        chartType: "table",
      },
    ],
  },
];
