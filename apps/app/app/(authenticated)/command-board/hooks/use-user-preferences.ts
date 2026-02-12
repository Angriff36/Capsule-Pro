"use client";

import { useCallback, useEffect } from "react";

import type { ViewportPreferences } from "../types";
import { getUserPreferences, saveUserPreference } from "../actions/preferences";

/**
 * Default viewport preferences
 */
const DEFAULT_VIEWPORT_PREFERENCES: ViewportPreferences = {
  zoom: 1,
  panX: 0,
  panY: 0,
  gridSize: 40,
  showGrid: true,
  gridSnapEnabled: true,
};

const VIEWPORT_PREFERENCES_CATEGORY = "viewport";

/**
 * Hook for user preferences from database instead of localStorage
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<ViewportPreferences>(DEFAULT_VIEWPORT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      setIsLoading(true);
      const result = await getUserPreferences(VIEWPORT_PREFERENCES_CATEGORY);

      if (result.success && result.preferences) {
        // Merge all preferences in category (there should be only one entry)
        const viewportPrefs = result.preferences.find(
          (p) => p.preferenceKey === "viewport"
        );

        if (viewportPrefs) {
          const prefs: ViewportPreferences = {
            zoom: (viewportPrefs.preferenceValue as any)?.zoom ?? DEFAULT_VIEWPORT_PREFERENCES.zoom,
            panX: (viewportPrefs.preferenceValue as any)?.panX ?? DEFAULT_VIEWPORT_PREFERENCES.panX,
            panY: (viewportPrefs.preferenceValue as any)?.panY ?? DEFAULT_VIEWPORT_PREFERENCES.panY,
            gridSize: (viewportPrefs.preferenceValue as any)?.gridSize ?? DEFAULT_VIEWPORT_PREFERENCES.gridSize,
            showGrid: (viewportPrefs.preferenceValue as any)?.showGrid ?? DEFAULT_VIEWPORT_PREFERENCES.showGrid,
            gridSnapEnabled: (viewportPrefs.preferenceValue as any)?.gridSnapEnabled ?? DEFAULT_VIEWPORT_PREFERENCES.gridSnapEnabled,
          };
          setPreferences(prefs);
        }
      }
      setIsLoading(false);
    }

    loadPreferences();
  }, []);

  const savePreferences = useCallback(
    async (updates: Partial<ViewportPreferences>) => {
      setIsLoading(true);

      // Save viewport preferences as a single JSON value
      const result = await saveUserPreference({
        preferenceKey: "viewport",
        preferenceValue: {
          ...preferences,
          ...updates,
        },
        category: VIEWPORT_PREFERENCES_CATEGORY,
      });

      if (result.success && result.data) {
        setPreferences((prev) => ({
          ...prev,
          ...updates,
        }));
      }

      setIsLoading(false);
    },
    [preferences]
  );

  return {
    preferences,
    setPreferences: savePreferences,
    isLoading,
  };
}
