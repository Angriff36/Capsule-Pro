import type { Metadata } from "next";
import type React from "react";
type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};
export declare const dynamicParams = false;
export declare const generateStaticParams: () => any;
export declare const generateMetadata: (props: PageProps) => Promise<Metadata>;
declare const DocsPageRoute: (props: PageProps) => Promise<React.ReactElement>;
export default DocsPageRoute;
//# sourceMappingURL=page.d.ts.map
