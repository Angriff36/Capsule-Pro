import type { Metadata } from "next";
type LegalPageProperties = {
  readonly params: Promise<{
    slug: string;
  }>;
};
export declare const generateMetadata: ({
  params,
}: LegalPageProperties) => Promise<Metadata>;
export declare const generateStaticParams: () => Promise<
  {
    slug: string;
  }[]
>;
declare const LegalPage: ({
  params,
}: LegalPageProperties) => Promise<import("react").JSX.Element>;
export default LegalPage;
//# sourceMappingURL=page.d.ts.map
