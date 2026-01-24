import type { Metadata } from "next";
type BlogProps = {
  params: Promise<{
    locale: string;
  }>;
};
export declare const generateMetadata: ({
  params,
}: BlogProps) => Promise<Metadata>;
declare const BlogIndex: ({
  params,
}: BlogProps) => Promise<import("react").JSX.Element>;
export default BlogIndex;
//# sourceMappingURL=page.d.ts.map
