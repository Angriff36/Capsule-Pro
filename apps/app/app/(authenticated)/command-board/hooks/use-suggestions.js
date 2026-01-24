"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.useSuggestions = useSuggestions;
const react_1 = require("react");
function useSuggestions(tenantId, boardId, eventId) {
  const [suggestions, setSuggestions] = (0, react_1.useState)([]);
  const [isLoading, setIsLoading] = (0, react_1.useState)(false);
  const [error, setError] = (0, react_1.useState)(null);
  const fetchSuggestions = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("maxSuggestions", "5");
      if (boardId) params.append("boardId", boardId);
      if (eventId) params.append("eventId", eventId);
      const response = await fetch(`/api/ai/suggestions?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const dismissSuggestion = async (suggestionId) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };
  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    dismissSuggestion,
  };
}
