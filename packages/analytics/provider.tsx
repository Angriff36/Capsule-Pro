import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import type { ReactNode } from "react";
import { keys } from "./keys";

type AnalyticsProviderProps = {
  readonly children: ReactNode;
};

const { NEXT_PUBLIC_GA_MEASUREMENT_ID } = keys();

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => (
  <>
    {/* TODO: Add a client-side PostHog tracker (page views + key events) once we define the event schema/consent rules. */}
    {children}
    <VercelAnalytics />
    {NEXT_PUBLIC_GA_MEASUREMENT_ID && (
      <GoogleAnalytics gaId={NEXT_PUBLIC_GA_MEASUREMENT_ID} />
    )}
  </>
);
