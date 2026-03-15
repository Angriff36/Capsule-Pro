import "server-only";
import { PostHog } from "posthog-node";
import { keys } from "./keys";

type AnalyticsClient = Pick<
  PostHog,
  "capture" | "identify" | "groupIdentify" | "isFeatureEnabled" | "shutdown"
>;

const createNoopAnalytics = (): AnalyticsClient => ({
  capture: (..._args: Parameters<PostHog["capture"]>) => undefined,
  identify: (..._args: Parameters<PostHog["identify"]>) => undefined,
  groupIdentify: (..._args: Parameters<PostHog["groupIdentify"]>) => undefined,
  isFeatureEnabled: async (
    ..._args: Parameters<PostHog["isFeatureEnabled"]>
  ) => undefined,
  shutdown: async (..._args: Parameters<PostHog["shutdown"]>) => undefined,
});

const env = keys();
const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = env.NEXT_PUBLIC_POSTHOG_HOST;
const hasPostHog = !!posthogKey && !!posthogHost;

export const analytics: AnalyticsClient = hasPostHog
  ? new PostHog(posthogKey, {
      host: posthogHost,

      // Don't batch events and flush immediately - we're running in a serverless environment
      flushAt: 1,
      flushInterval: 0,
    })
  : createNoopAnalytics();
