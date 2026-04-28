"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { keys } from "./keys";

const CONSENT_KEY = "capsule-pro:analytics-consent";

type ConsentState = "undecided" | "granted" | "denied";

function readConsent(): ConsentState {
  if (typeof window === "undefined") return "undecided";
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === "granted" || stored === "denied") return stored;
  return "undecided";
}

function writeConsent(state: ConsentState): void {
  localStorage.setItem(CONSENT_KEY, state);
}

/**
 * Manages PostHog consent state. Returns the current consent value and
 * setters so any UI (cookie banner, settings page) can drive it.
 */
export function useAnalyticsConsent() {
  const [consent, setConsentState] = useState<ConsentState>(() =>
    readConsent()
  );

  const grant = () => {
    writeConsent("granted");
    setConsentState("granted");
  };

  const deny = () => {
    writeConsent("denied");
    setConsentState("denied");
    // Opt out of PostHog completely
    posthog.opt_out_capturing();
  };

  const reset = () => {
    localStorage.removeItem(CONSENT_KEY);
    setConsentState("undecided");
  };

  return { consent, grant, deny, reset, isUndecided: consent === "undecided" };
}

interface PostHogProviderProps {
  readonly children: ReactNode;
}

/**
 * Client-side PostHog provider with consent gating.
 *
 * - Initialises PostHog only when the key/host are configured.
 * - If consent has been denied, PostHog is opted-out immediately.
 * - If consent is undecided, events are queued client-side until the user
 *   grants or denies (PostHog-js handles this via `opt_in_capturing`).
 * - The `PostHogProvider` context is always available so components can call
 *   `usePostHog()` for custom events without null-checking.
 */
export const PostHogProvider = ({ children }: PostHogProviderProps) => {
  const [client, setClient] = useState<typeof posthog | null>(null);

  useEffect(() => {
    const env = keys();
    const key = env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!(key && host)) return;

    posthog.init(key, {
      api_host: host,
      // Don't start capturing until consent is resolved
      loaded: (ph) => {
        const consent = readConsent();
        if (consent === "denied") {
          ph.opt_out_capturing();
        } else if (consent === "granted") {
          ph.opt_in_capturing();
        }
        // undecided → PostHog queues events, waiting for opt_in/opt_out
      },
    });

    setClient(posthog);

    return () => {
      // Cleanup on unmount (HMR / route changes)
      posthog.reset();
    };
  }, []);

  if (!client) return <>{children}</>;

  return <PHProvider client={client}>{children}</PHProvider>;
};

export { CONSENT_KEY };
export type { ConsentState };
