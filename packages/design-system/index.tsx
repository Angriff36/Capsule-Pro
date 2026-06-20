import { AuthProvider } from "@repo/auth/provider";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { DisplayPreferencesProvider } from "./providers/display-preferences";
import { HighContrastProvider } from "./providers/high-contrast";
import { ThemeProvider, type ThemeProviderProps } from "./providers/theme";

export {
  type Density,
  type FontSize,
  useDisplayPreferences,
} from "./providers/display-preferences";
export { useHighContrast } from "./providers/high-contrast";
export { useTheme } from "./providers/theme";

type DesignSystemProviderProperties = ThemeProviderProps & {
  privacyUrl?: string;
  termsUrl?: string;
  helpUrl?: string;
};

export const DesignSystemProvider = ({
  children,
  privacyUrl,
  termsUrl,
  helpUrl,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider {...properties}>
    <HighContrastProvider>
      <DisplayPreferencesProvider>
        <AuthProvider
          helpUrl={helpUrl}
          privacyUrl={privacyUrl}
          termsUrl={termsUrl}
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </AuthProvider>
      </DisplayPreferencesProvider>
    </HighContrastProvider>
  </ThemeProvider>
);
