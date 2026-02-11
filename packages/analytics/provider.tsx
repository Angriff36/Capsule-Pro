import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import type { ReactNode } from "react";
import { keys } from "./keys";

interface AnalyticsProviderProps {
  readonly children: ReactNode;
}

const { NEXT_PUBLIC_GA_MEASUREMENT_ID } = keys();
const isProduction = process.env.NODE_ENV === "production";

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => (
  <>
    {/* TODO: Add a client-side PostHog tracker (page views + key events) once we define the event schema/consent rules. */}
    {children}
    {isProduction && <VercelAnalytics />}
    {NEXT_PUBLIC_GA_MEASUREMENT_ID && (
      <GoogleAnalytics gaId={NEXT_PUBLIC_GA_MEASUREMENT_ID} />
    )}
  </>
);
