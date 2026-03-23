import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { Toolbar as CMSToolbar } from "@repo/cms/components/toolbar";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { Toolbar } from "@repo/feature-flags/components/toolbar";
import { getDictionary, locales } from "@repo/internationalization";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

interface RootLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

// Validate locale is supported
function isValidLocale(locale: string): boolean {
  const normalizedLocale = locale.split("-")[0].toLowerCase();
  return locales.includes(normalizedLocale as typeof locales[number]);
}

const RootLayout = async ({ children, params }: RootLayoutProperties) => {
  const { locale } = await params;
  
  // Validate locale - return 404 for invalid locales (bots, static files, etc.)
  if (!isValidLocale(locale)) {
    notFound();
  }
  
  const dictionary = await getDictionary(locale);

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
      </body>
    </html>
  );
};

export default RootLayout;
