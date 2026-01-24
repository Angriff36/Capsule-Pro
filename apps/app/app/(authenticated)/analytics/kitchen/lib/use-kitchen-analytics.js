"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletionColor = getCompletionColor;
exports.useKitchenAnalytics = useKitchenAnalytics;
const react_1 = require("react");
const seed_data_1 = require("../../../data/seed-data");
function getCompletionColor(value) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  if (value >= 40) return "bg-orange-500";
  return "bg-red-500";
}
function useKitchenAnalytics(period) {
  return (0, react_1.useMemo)(() => {
    const multiplier = period === "30d" ? 1 : 1;
    const data = {
      ...seed_data_1.seedKitchenAnalytics,
      stationThroughput: seed_data_1.seedKitchenAnalytics.stationThroughput.map(
        (station) => ({
          ...station,
          load: Math.min(100, Math.round(station.load * multiplier)),
          completed: Math.min(100, Math.round(station.completed * multiplier)),
        })
      ),
    };
    return {
      data,
      isLoading: false,
      error: null,
    };
  }, [period]);
}
