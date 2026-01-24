"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = formatCurrency;
exports.formatPercentage = formatPercentage;
exports.getSeverityVariant = getSeverityVariant;
exports.fetchFinanceAnalytics = fetchFinanceAnalytics;
exports.useFinanceAnalytics = useFinanceAnalytics;
const react_1 = require("react");
// Helper function to format currency for display
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
// Helper function to format percentage for display
function formatPercentage(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}
// Helper function to get severity color variant
function getSeverityVariant(severity) {
  switch (severity) {
    case "High":
      return "destructive";
    case "Medium":
      return "outline";
    default:
      return "secondary";
  }
}
// Client function to fetch finance analytics data
async function fetchFinanceAnalytics(options = {}) {
  const { period = "30d", locationId } = options;
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (locationId) params.set("locationId", locationId);
  const response = await fetch(`/api/analytics/finance?${params.toString()}`);
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to fetch finance analytics" }));
    throw new Error(error.message || "Failed to fetch finance analytics");
  }
  return response.json();
}
// React hook for finance analytics
function useFinanceAnalytics(options = {}) {
  const { enabled = true, ...fetchOptions } = options;
  const [data, setData] = (0, react_1.useState)(null);
  const [isLoading, setIsLoading] = (0, react_1.useState)(false);
  const [error, setError] = (0, react_1.useState)(null);
  const fetchData = async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFinanceAnalytics(fetchOptions);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch finance analytics")
      );
    } finally {
      setIsLoading(false);
    }
  };
  (0, react_1.useEffect)(() => {
    fetchData();
  }, [enabled, fetchOptions.period, fetchOptions.locationId]);
  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
