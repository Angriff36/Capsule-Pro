Object.defineProperty(exports, "__esModule", { value: true });
const provider_1 = require("@repo/analytics/provider");
const RootLayout = ({ children }) => (
  <html lang="en">
    <body>
      <provider_1.AnalyticsProvider>{children}</provider_1.AnalyticsProvider>
    </body>
  </html>
);
exports.default = RootLayout;
