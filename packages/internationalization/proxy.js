var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.internationalizationMiddleware = void 0;
const intl_localematcher_1 = require("@formatjs/intl-localematcher");
const negotiator_1 = __importDefault(require("negotiator"));
const middleware_1 = require("next-international/middleware");
const languine_json_1 = __importDefault(require("./languine.json"));
const locales = [
  languine_json_1.default.locale.source,
  ...languine_json_1.default.locale.targets,
];
const I18nMiddleware = (0, middleware_1.createI18nMiddleware)({
  locales,
  defaultLocale: "en",
  urlMappingStrategy: "rewriteDefault",
  resolveLocaleFromRequest: (request) => {
    const headers = Object.fromEntries(request.headers.entries());
    const negotiator = new negotiator_1.default({ headers });
    const acceptedLanguages = negotiator.languages();
    const matchedLocale = (0, intl_localematcher_1.match)(
      acceptedLanguages,
      locales,
      "en"
    );
    return matchedLocale;
  },
});
const internationalizationMiddleware = (request) => I18nMiddleware(request);
exports.internationalizationMiddleware = internationalizationMiddleware;
exports.config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
//https://nextjs.org/docs/app/building-your-application/routing/internationalization
//https://github.com/vercel/next.js/tree/canary/examples/i18n-routing
//https://github.com/QuiiBz/next-international
//https://next-international.vercel.app/docs/app-middleware-configuration
