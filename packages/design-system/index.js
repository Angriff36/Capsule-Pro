Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignSystemProvider = void 0;
const provider_1 = require("@repo/auth/provider");
const sonner_1 = require("./components/ui/sonner");
const tooltip_1 = require("./components/ui/tooltip");
const theme_1 = require("./providers/theme");
const DesignSystemProvider = ({
  children,
  privacyUrl,
  termsUrl,
  helpUrl,
  ...properties
}) => (
  <theme_1.ThemeProvider {...properties}>
    <provider_1.AuthProvider
      helpUrl={helpUrl}
      privacyUrl={privacyUrl}
      termsUrl={termsUrl}
    >
      <tooltip_1.TooltipProvider>{children}</tooltip_1.TooltipProvider>
      <sonner_1.Toaster />
    </provider_1.AuthProvider>
  </theme_1.ThemeProvider>
);
exports.DesignSystemProvider = DesignSystemProvider;
