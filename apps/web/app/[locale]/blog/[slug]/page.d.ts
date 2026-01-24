import type { Metadata } from "next";
type BlogPostProperties = {
  readonly params: Promise<{
    slug: string;
  }>;
};
export declare const generateMetadata: () => Promise<Metadata>;
export declare const generateStaticParams: () => Promise<
  {
    slug: string;
  }[]
>;
declare const BlogPost: ({ params }: BlogPostProperties) => Promise<never>;
export default BlogPost;
//# sourceMappingURL=page.d.ts.map
