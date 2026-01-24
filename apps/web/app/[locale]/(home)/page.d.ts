import type { Metadata } from "next";
type HomeProps = {
  params: Promise<{
    locale: string;
  }>;
};
export declare const generateMetadata: ({
  params,
}: HomeProps) => Promise<Metadata>;
declare const Home: ({
  params,
}: HomeProps) => Promise<import("react").JSX.Element>;
export default Home;
//# sourceMappingURL=page.d.ts.map
