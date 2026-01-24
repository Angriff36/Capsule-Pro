"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CLVDashboard = CLVDashboard;
const utils_1 = require("@repo/design-system/lib/utils");
const client_table_1 = require("./client-table");
const cohort_analysis_1 = require("./cohort-analysis");
const metrics_cards_1 = require("./metrics-cards");
const predictive_ltv_1 = require("./predictive-ltv");
const revenue_trends_1 = require("./revenue-trends");
function CLVDashboard({ metrics, clients, className }) {
  return (
    <div className={(0, utils_1.cn)("flex flex-col gap-6", className)}>
      <metrics_cards_1.MetricsCards metrics={metrics} />
      <div className="grid gap-6 lg:grid-cols-2">
        <revenue_trends_1.RevenueTrends data={metrics.revenueByMonth} />
        <cohort_analysis_1.CohortAnalysis data={metrics.cohortData} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <client_table_1.ClientTable clients={clients} />
        <predictive_ltv_1.PredictiveLTV data={metrics.predictiveLTV} />
      </div>
    </div>
  );
}
