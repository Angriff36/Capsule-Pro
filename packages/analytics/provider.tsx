import type { ReactNode } from "react";
import { PostHogProvider } from "./posthog-provider";

interface AnalyticsProviderProps {
  readonly children: ReactNode;
}

// Framework-agnostic analytics context provider. Only wraps PostHog so this
// module does not import from `next/*` or `@next/*` (see AGENTS.md "Package
// Boundaries"). Apps that need Google Analytics (`@next/third-parties/google`)
// or Vercel Analytics (`@vercel/analytics/react`) render those components
// directly in their app layout — not through this provider.
export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => (
  <PostHogProvider>{children}</PostHogProvider>
);
