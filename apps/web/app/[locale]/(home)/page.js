Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = void 0;
const feature_flags_1 = require("@repo/feature-flags");
const internationalization_1 = require("@repo/internationalization");
const metadata_1 = require("@repo/seo/metadata");
const react_pump_1 = require("basehub/react-pump");
const cases_1 = require("./components/cases");
const cta_1 = require("./components/cta");
const faq_1 = require("./components/faq");
const features_1 = require("./components/features");
const hero_1 = require("./components/hero");
const stats_1 = require("./components/stats");
const testimonials_1 = require("./components/testimonials");
const generateMetadata = async ({ params }) => {
  const { locale } = await params;
  const dictionary = await (0, internationalization_1.getDictionary)(locale);
  return (0, metadata_1.createMetadata)(dictionary.web.home.meta);
};
exports.generateMetadata = generateMetadata;
const Home = async ({ params }) => {
  const { locale } = await params;
  const dictionary = await (0, internationalization_1.getDictionary)(locale);
  const betaFeature = await (0, feature_flags_1.showBetaFeature)();
  return (
    <react_pump_1.Pump queries={[{ __typename: true }]}>
      {async ([data]) => {
        "use server";
        return (
          <>
            <pre className="hidden">{JSON.stringify(data, null, 2)}</pre>
            {betaFeature && (
              <div className="w-full bg-black py-2 text-center text-white">
                Beta feature now available
              </div>
            )}
            <hero_1.Hero dictionary={dictionary} />
            <cases_1.Cases dictionary={dictionary} />
            <features_1.Features dictionary={dictionary} />
            <stats_1.Stats dictionary={dictionary} />
            <testimonials_1.Testimonials dictionary={dictionary} />
            <faq_1.FAQ dictionary={dictionary} />
            <cta_1.CTA dictionary={dictionary} />
          </>
        );
      }}
    </react_pump_1.Pump>
  );
};
exports.default = Home;
