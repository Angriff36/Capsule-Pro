"use client";

import {
  type Density,
  type FontSize,
  useDisplayPreferences,
} from "@repo/design-system";
import { useEffect, useRef } from "react";
import { apiUrl } from "@/app/lib/api";

/**
 * Persists display preferences (font size + density) per user ACCOUNT (cross-device),
 * on top of the per-device localStorage handled by DisplayPreferencesProvider.
 *
 * Storage uses the existing user-preferences surface (`UserPreference` upsert). Reads
 * reconcile the account values into the live classes on load; user-initiated changes are
 * written back best-effort. All network work is guarded — if the endpoint is unreachable
 * or the user is unauthenticated, the localStorage value silently stands.
 *
 * NOTE: persistence currently rides the existing (non-Manifest) `/api/user-preferences`
 * route — the same surface the high-contrast preference uses (HighContrastAccountSync).
 * Wrapping that upsert in a governed `UserPreference` Manifest command (constitution §9)
 * is a follow-up that needs a new entity + migration — out of scope for this change.
 */

const FONT_SIZE_PREF_KEY = "fontSize";
const DENSITY_PREF_KEY = "density";
const CATEGORY = "ui";
const PREFERENCES_PATH = "/api/user-preferences";

const FONT_SIZE_VALUES: FontSize[] = ["default", "large", "x-large"];
const DENSITY_VALUES: Density[] = ["default", "compact", "spacious"];

interface StoredPreference {
  preference_key?: string;
  preference_value?: unknown;
}

const asFontSize = (value: unknown): FontSize | undefined =>
  FONT_SIZE_VALUES.find((v) => v === value);

const asDensity = (value: unknown): Density | undefined =>
  DENSITY_VALUES.find((v) => v === value);

const persistPreference = (key: string, value: string): void => {
  fetch(apiUrl(PREFERENCES_PATH), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      preferenceKey: key,
      preferenceValue: value,
      category: CATEGORY,
    }),
  }).catch(() => {
    // Best-effort; localStorage already holds the value.
  });
};

const findValue = (prefs: StoredPreference[], key: string): unknown =>
  prefs.find((p) => p.preference_key === key)?.preference_value;

/** Fetch the user's `ui`-category preferences; returns [] on any failure. */
const fetchStoredPreferences = async (): Promise<StoredPreference[]> => {
  try {
    const res = await fetch(
      apiUrl(`${PREFERENCES_PATH}?category=${CATEGORY}`),
      {
        credentials: "include",
      }
    );
    if (!res.ok) {
      return [];
    }
    const json = (await res.json()) as { preferences?: StoredPreference[] };
    return json.preferences ?? [];
  } catch {
    // Offline / unauthenticated — the localStorage values stand.
    return [];
  }
};

export function DisplayPreferencesAccountSync() {
  const { fontSize, density, setFontSize, setDensity } =
    useDisplayPreferences();
  const hydrated = useRef(false);

  // Load the account preferences once and reconcile them with the local classes.
  useEffect(() => {
    let cancelled = false;
    fetchStoredPreferences().then((prefs) => {
      if (cancelled) {
        return;
      }
      const storedFont = asFontSize(findValue(prefs, FONT_SIZE_PREF_KEY));
      const storedDensity = asDensity(findValue(prefs, DENSITY_PREF_KEY));
      if (storedFont) {
        setFontSize(storedFont);
      }
      if (storedDensity) {
        setDensity(storedDensity);
      }
      hydrated.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [setFontSize, setDensity]);

  // Persist user-initiated changes to the account. (One redundant idempotent upsert can
  // fire right after hydration when the account value differed — harmless.)
  useEffect(() => {
    if (hydrated.current) {
      persistPreference(FONT_SIZE_PREF_KEY, fontSize);
    }
  }, [fontSize]);

  useEffect(() => {
    if (hydrated.current) {
      persistPreference(DENSITY_PREF_KEY, density);
    }
  }, [density]);

  return null;
}
