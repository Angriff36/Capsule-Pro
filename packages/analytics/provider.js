Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsProvider = void 0;
const google_1 = require("@next/third-parties/google");
const react_1 = require("@vercel/analytics/react");
const keys_1 = require("./keys");
const { NEXT_PUBLIC_GA_MEASUREMENT_ID } = (0, keys_1.keys)();
const AnalyticsProvider = ({ children }) => (
  <>
    {children}
    <react_1.Analytics />
    {NEXT_PUBLIC_GA_MEASUREMENT_ID && (
      <google_1.GoogleAnalytics gaId={NEXT_PUBLIC_GA_MEASUREMENT_ID} />
    )}
  </>
);
exports.AnalyticsProvider = AnalyticsProvider;
