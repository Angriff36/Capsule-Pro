import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { createI18nMiddleware } from "next-international/middleware";
import languine from "./languine.json" with { type: "json" };

const locales = [languine.locale.source, ...languine.locale.targets];

const I18nMiddleware: ReturnType<typeof createI18nMiddleware> =
  createI18nMiddleware({
    locales,
    defaultLocale: "en",
    urlMappingStrategy: "rewriteDefault",
    resolveLocaleFromRequest: (request) => {
      const headers = Object.fromEntries(request.headers.entries());
      const negotiator = new Negotiator({ headers });
      const acceptedLanguages = negotiator.languages();

      const matchedLocale = matchLocale(acceptedLanguages, locales, "en");

      return matchedLocale;
    },
  });

// Re-export the middleware. The request type is intentionally inferred from
// next-international so this module does not import directly from `next/*`
// (see AGENTS.md "Package Boundaries").
export const internationalizationMiddleware: typeof I18nMiddleware = (
  request
) => I18nMiddleware(request);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

//https://nextjs.org/docs/app/building-your-application/routing/internationalization
//https://github.com/vercel/next.js/tree/canary/examples/i18n-routing
//https://github.com/QuiiBz/next-international
//https://next-international.vercel.app/docs/app-middleware-configuration
