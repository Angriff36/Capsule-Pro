"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.useSuggestions = useSuggestions;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
function useSuggestions(tenantId) {
  const router = (0, navigation_1.useRouter)();
  const [suggestions, setSuggestions] = (0, react_1.useState)([]);
  const [isLoading, setIsLoading] = (0, react_1.useState)(false);
  const [error, setError] = (0, react_1.useState)(null);
  const fetchSuggestions = async (options) => {
    if (!tenantId) {
      console.warn("No tenantId provided to useSuggestions");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("maxSuggestions", String(options?.maxSuggestions || 5));
      if (options?.timeframe) params.append("timeframe", options.timeframe);
      const response = await fetch(`/api/ai/suggestions?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const dismissSuggestion = (suggestionId) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };
  const handleAction = (suggestion) => {
    // Handle the action based on type
    if (suggestion.action.type === "navigate") {
      router.push(suggestion.action.path);
    } else if (suggestion.action.type === "api_call") {
      // API call actions would be handled differently
      console.log("API call action:", suggestion.action);
    } else if (suggestion.action.type === "external") {
      window.open(suggestion.action.url, "_blank");
    }
  };
  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    dismissSuggestion,
    handleAction,
  };
}
