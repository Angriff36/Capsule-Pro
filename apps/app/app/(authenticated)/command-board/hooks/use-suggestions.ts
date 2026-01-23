"use client";

import { useState } from "react";
import type { SuggestedAction } from "../actions/suggestions-types";

export function useSuggestions(
  tenantId: string,
  boardId?: string,
  eventId?: string
) {
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const dismissSuggestion = async (suggestionId: string) => {
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
