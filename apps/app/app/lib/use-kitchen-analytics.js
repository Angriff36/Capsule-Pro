"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.useKitchenAnalytics = useKitchenAnalytics;
exports.formatCompletionTime = formatCompletionTime;
exports.getLoadColor = getLoadColor;
exports.getCompletionColor = getCompletionColor;
const react_1 = require("react");
async function fetchKitchenAnalytics(period, locationId) {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (locationId) params.set("locationId", locationId);
  const response = await fetch(
    `/api/analytics/kitchen${params.toString() ? `?${params.toString()}` : ""}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch kitchen analytics");
  }
  return response.json();
}
function useKitchenAnalytics(period, locationId) {
  const [data, setData] = (0, react_1.useState)(null);
  const [isLoading, setIsLoading] = (0, react_1.useState)(true);
  const [error, setError] = (0, react_1.useState)(null);
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchKitchenAnalytics(period, locationId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  (0, react_1.useEffect)(() => {
    fetchData();
  }, [period, locationId]);
  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
// Helper function to format completion time
function formatCompletionTime(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
// Helper function to get load color
function getLoadColor(load) {
  if (load >= 80) return "bg-red-500";
  if (load >= 60) return "bg-orange-500";
  if (load >= 40) return "bg-yellow-500";
  return "bg-green-500";
}
// Helper function to get completion color
function getCompletionColor(rate) {
  if (rate >= 90) return "bg-emerald-500";
  if (rate >= 70) return "bg-blue-500";
  if (rate >= 50) return "bg-yellow-500";
  return "bg-red-500";
}
