import { env } from "@/env";
import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { Toaster } from "@repo/design-system/components/ui/sonner";
import { fonts } from "@repo/design-system/lib/fonts";
import { Toolbar } from "@repo/feature-flags/components/toolbar";
import type { ReactNode } from "react";
import ClerkProviderClient from "./clerk-provider.client";
import { AuthHeader } from "./components/auth-header";

interface RootLayoutProperties {
  readonly children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProperties) => (
  <html className={fonts} lang="en" suppressHydrationWarning>
    <body>
      <ClerkProviderClient>
        <AuthHeader />
        <AnalyticsProvider>
          <DesignSystemProvider
            helpUrl={env.NEXT_PUBLIC_DOCS_URL}
            privacyUrl={new URL(
              "/legal/privacy",
              env.NEXT_PUBLIC_WEB_URL
            ).toString()}
            termsUrl={new URL(
              "/legal/terms",
              env.NEXT_PUBLIC_WEB_URL
            ).toString()}
          >
            {children}
          </DesignSystemProvider>
        </AnalyticsProvider>
        <Toolbar />
        <Toaster />
      </ClerkProviderClient>
    </body>
  </html>
);

export default RootLayout;
