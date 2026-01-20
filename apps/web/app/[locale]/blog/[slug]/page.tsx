
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type BlogPostProperties = {
  readonly params: Promise<{
    slug: string;
  }>;
};

export const generateMetadata = async (): Promise<Metadata> => {
  // Blog disabled -> no per-post metadata
  return {};
};

export const generateStaticParams = async (): Promise<{ slug: string }[]> => {
  // Blog disabled -> no static params
  return [];
};

const BlogPost = async ({ params }: BlogPostProperties) => {
  // Keep the route valid, but always 404 so you don't ship broken pages.
  // If you'd rather show a friendly message instead of 404, remove notFound()
  // and render a placeholder like the index page.
  await params;
  notFound();
};

export default BlogPost;
