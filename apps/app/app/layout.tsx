import { env } from "@/env";
import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { Toaster } from "@repo/design-system/components/ui/sonner";
import { fonts } from "@repo/design-system/lib/fonts";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ClerkProviderClient from "./clerk-provider.client";
import { AuthHeader } from "./components/auth-header";

interface RootLayoutProperties {
  readonly children: ReactNode;
}

const metadataBaseUrl =
  env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_WEB_URL || "http://127.0.0.1:2221";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
};

const RootLayout = async ({ children }: RootLayoutProperties) => {
  // Only load feature flags toolbar in development to reduce bundle size
  const Toolbar =
    process.env.NODE_ENV === "development"
      ? (await import("@repo/feature-flags/components/toolbar")).Toolbar
      : null;

  return (
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
          {Toolbar && <Toolbar />}
          <Toaster />
        </ClerkProviderClient>
      </body>
    </html>
  );
};

export default RootLayout;
