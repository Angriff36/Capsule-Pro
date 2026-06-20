"use client";

import { useHighContrast } from "@repo/design-system";
import { useEffect, useRef } from "react";
import { apiUrl } from "@/app/lib/api";

/**
 * Persists the high-contrast preference per user ACCOUNT (cross-device), on top of the
 * per-device localStorage handled by HighContrastProvider.
 *
 * Storage uses the existing user-preferences surface (`UserPreference` upsert). Reads
 * reconcile the account value into the live class on load; user-initiated changes are
 * written back best-effort. All network work is guarded — if the endpoint is
 * unreachable or the user is unauthenticated, the localStorage value silently stands.
 *
 * NOTE: persistence currently rides the existing (non-Manifest) `/api/user-preferences`
 * route. Wrapping that upsert in a governed `UserPreference` Manifest command (constitution
 * §9) is a follow-up that needs a new entity + migration — out of scope for this change.
 */

const PREFERENCE_KEY = "highContrast";
const CATEGORY = "ui";
const PREFERENCES_PATH = "/api/user-preferences";

interface StoredPreference {
  preference_key?: string;
  preference_value?: unknown;
}

const isEnabled = (value: unknown): boolean =>
  value === true || value === "true";

export function HighContrastAccountSync() {
  const { enabled, setEnabled } = useHighContrast();
  const hydrated = useRef(false);

  // Load the account preference once and reconcile it with the local class.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`${PREFERENCES_PATH}?category=${CATEGORY}`),
          { credentials: "include" }
        );
        if (res.ok) {
          const json = (await res.json()) as {
            preferences?: StoredPreference[];
          };
          const pref = json.preferences?.find(
            (p) => p.preference_key === PREFERENCE_KEY
          );
          if (!cancelled && pref) {
            setEnabled(isEnabled(pref.preference_value));
          }
        }
      } catch {
        // Offline / unauthenticated — the localStorage value stands.
      } finally {
        if (!cancelled) {
          hydrated.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setEnabled]);

  // Persist user-initiated changes to the account. (One redundant idempotent upsert can
  // fire right after hydration when the account value differed — harmless.)
  useEffect(() => {
    if (!hydrated.current) {
      return;
    }
    (async () => {
      try {
        await fetch(apiUrl(PREFERENCES_PATH), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferenceKey: PREFERENCE_KEY,
            preferenceValue: enabled,
            category: CATEGORY,
          }),
        });
      } catch {
        // Best-effort; localStorage already holds the value.
      }
    })();
  }, [enabled]);

  return null;
}
