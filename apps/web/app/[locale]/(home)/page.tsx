import { showBetaFeature } from "@repo/feature-flags";
import { getDictionary } from "@repo/internationalization";
import { createMetadata } from "@repo/seo/metadata";
import { Pump } from "basehub/react-pump";
import type { Metadata } from "next";
import { Cases } from "./components/cases";
import { CTA } from "./components/cta";
import { FAQ } from "./components/faq";
import { Features } from "./components/features";
import { Hero } from "./components/hero";
import { Stats } from "./components/stats";
import { Testimonials } from "./components/testimonials";

interface HomeProps {
  params: Promise<{
    locale: string;
  }>;
}

// ISR: Revalidate every hour - home page content changes infrequently
export const revalidate = 3600;

export const generateMetadata = async ({
  params,
}: HomeProps): Promise<Metadata> => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return createMetadata(dictionary.web.home.meta);
};

const Home = async ({ params }: HomeProps) => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);
  const betaFeature = await showBetaFeature();

  return (
    <Pump queries={[{ __typename: true }]}>
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
            <Hero dictionary={dictionary} />
            <Cases dictionary={dictionary} />
            <Features dictionary={dictionary} />
            <Stats dictionary={dictionary} locale={locale} />
            <Testimonials dictionary={dictionary} />
            <FAQ dictionary={dictionary} />
            <CTA dictionary={dictionary} />
          </>
        );
      }}
    </Pump>
  );
};

export default Home;
