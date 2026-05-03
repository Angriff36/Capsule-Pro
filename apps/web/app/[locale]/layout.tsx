import "./styles.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { keys as analyticsKeys } from "@repo/analytics/keys";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { Toolbar as CMSToolbar } from "@repo/cms/components/toolbar";
import { DesignSystemProvider } from "@repo/design-system";
import { cn } from "@repo/design-system/lib/utils";
import { Toolbar } from "@repo/feature-flags/components/toolbar";
import { getDictionary, isValidLocale } from "@repo/internationalization";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { fonts } from "@/lib/fonts";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

interface RootLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

const RootLayout = async ({ children, params }: RootLayoutProperties) => {
  const { locale } = await params;

  // Validate locale - return 404 for invalid locales (bots, static files, etc.)
  if (!isValidLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const analyticsEnv = analyticsKeys();

  return (
    <html className={cn(fonts, "scroll-smooth")} lang={locale}>
      <body>
        <AnalyticsProvider>
          <DesignSystemProvider>
            <Header dictionary={dictionary} />
            {children}
            <Footer />
          </DesignSystemProvider>
          <Toolbar />
          <CMSToolbar />
        </AnalyticsProvider>
        {process.env.NODE_ENV === "production" && <VercelAnalytics />}
        {analyticsEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={analyticsEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
};

export default RootLayout;
