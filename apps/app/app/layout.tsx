import { env } from "@/env";
import "./styles.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { Toaster } from "@repo/design-system/components/ui/sonner";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fonts } from "@/lib/fonts";
import ClerkProviderClient from "./clerk-provider.client";
import { AuthHeader } from "./components/auth-header";
import { QueryProvider } from "./query-provider";

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
          <QueryProvider>
            <AuthHeader />
            <AnalyticsProvider>
              <DesignSystemProvider
                helpUrl={env.NEXT_PUBLIC_DOCS_URL}
                privacyUrl={new URL(
                  "/legal/privacy",
                  env.NEXT_PUBLIC_WEB_URL || "https://example.com"
                ).toString()}
                termsUrl={new URL(
                  "/legal/terms",
                  env.NEXT_PUBLIC_WEB_URL || "https://example.com"
                ).toString()}
              >
                {children}
              </DesignSystemProvider>
            </AnalyticsProvider>
            {Toolbar && <Toolbar />}
            <Toaster />
          </QueryProvider>
        </ClerkProviderClient>
        {process.env.NODE_ENV === "production" && <VercelAnalytics />}
        {env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
};

export default RootLayout;
