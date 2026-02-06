"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { SuggestedAction, SuggestionsResponse } from "./suggestions-types";

export function useSuggestions(tenantId?: string | null) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async (options?: {
    maxSuggestions?: number;
    timeframe?: "today" | "week" | "month";
  }) => {
    if (!tenantId) {
      console.warn("No tenantId provided to useSuggestions");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("maxSuggestions", String(options?.maxSuggestions || 5));
      if (options?.timeframe) {
        params.append("timeframe", options.timeframe);
      }

      const response = await apiFetch(
        `/api/ai/suggestions?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data: SuggestionsResponse = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  const handleAction = (suggestion: SuggestedAction) => {
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
