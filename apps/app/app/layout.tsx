import { env } from "@/env";
import "./styles.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { Toolbar } from "@repo/feature-flags/components/toolbar";
import type { ReactNode } from "react";
import { AuthHeader } from "./components/auth-header";

type RootLayoutProperties = {
  readonly children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProperties) => (
  <ClerkProvider>
    <html className={fonts} lang="en" suppressHydrationWarning>
      <body>
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
      </body>
    </html>
  </ClerkProvider>
);

export default RootLayout;
