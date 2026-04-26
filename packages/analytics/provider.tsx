import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import type { ReactNode } from "react";
import { keys } from "./keys";
import { PostHogProvider } from "./posthog-provider";

interface AnalyticsProviderProps {
  readonly children: ReactNode;
}

const { NEXT_PUBLIC_GA_MEASUREMENT_ID } = keys();
const isProduction = process.env.NODE_ENV === "production";

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => (
  <>
    <PostHogProvider>{children}</PostHogProvider>
    {isProduction && <VercelAnalytics />}
    {NEXT_PUBLIC_GA_MEASUREMENT_ID && (
      <GoogleAnalytics gaId={NEXT_PUBLIC_GA_MEASUREMENT_ID} />
    )}
  </>
);
