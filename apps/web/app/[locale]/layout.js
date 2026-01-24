Object.defineProperty(exports, "__esModule", { value: true });
require("./styles.css");
const provider_1 = require("@repo/analytics/provider");
const toolbar_1 = require("@repo/cms/components/toolbar");
const design_system_1 = require("@repo/design-system");
const fonts_1 = require("@repo/design-system/lib/fonts");
const utils_1 = require("@repo/design-system/lib/utils");
const toolbar_2 = require("@repo/feature-flags/components/toolbar");
const internationalization_1 = require("@repo/internationalization");
const footer_1 = require("./components/footer");
const header_1 = require("./components/header");
const RootLayout = async ({ children, params }) => {
  const { locale } = await params;
  const dictionary = await (0, internationalization_1.getDictionary)(locale);
  return (
    <html
      className={(0, utils_1.cn)(fonts_1.fonts, "scroll-smooth")}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <provider_1.AnalyticsProvider>
          <design_system_1.DesignSystemProvider>
            <header_1.Header dictionary={dictionary} />
            {children}
            <footer_1.Footer />
          </design_system_1.DesignSystemProvider>
          <toolbar_2.Toolbar />
          <toolbar_1.Toolbar />
        </provider_1.AnalyticsProvider>
      </body>
    </html>
  );
};
exports.default = RootLayout;
