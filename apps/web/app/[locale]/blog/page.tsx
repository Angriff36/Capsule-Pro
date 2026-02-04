import { getDictionary } from "@repo/internationalization";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";

interface BlogProps {
  params: Promise<{
    locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: BlogProps): Promise<Metadata> => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  // Reuse your existing localized metadata shape if it exists.
  // If dictionary.web.blog.meta is missing, this will throw — in that case,
  // change this to a simple hardcoded createMetadata({ title: "...", ... }).
  return createMetadata(dictionary.web.blog.meta);
};

const BlogIndex = async ({ params }: BlogProps) => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto flex flex-col gap-6">
        <h1 className="max-w-xl font-regular text-3xl tracking-tighter md:text-5xl">
          {dictionary.web.blog.meta.title}
        </h1>

        <p className="max-w-2xl text-base text-muted-foreground">
          Blog is currently disabled. This page will be re-enabled when the CMS
          has a posts collection wired up.
        </p>

        <div className="pt-6">
          <Link className="text-sm underline underline-offset-4" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogIndex;
