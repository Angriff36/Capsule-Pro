Object.defineProperty(exports, "__esModule", { value: true });
exports.analytics = void 0;
require("server-only");
const posthog_node_1 = require("posthog-node");
const keys_1 = require("./keys");
exports.analytics = new posthog_node_1.PostHog(
  (0, keys_1.keys)().NEXT_PUBLIC_POSTHOG_KEY,
  {
    host: (0, keys_1.keys)().NEXT_PUBLIC_POSTHOG_HOST,
    // Don't batch events and flush immediately - we're running in a serverless environment
    flushAt: 1,
    flushInterval: 0,
  }
);
