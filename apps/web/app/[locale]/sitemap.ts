import fs from "node:fs";
import { blog, legal } from "@repo/cms";
import type { MetadataRoute } from "next";
import { env } from "@/env";

const appFolders = fs.readdirSync("app", { withFileTypes: true });
const pages = appFolders
  .filter((file) => file.isDirectory())
  .filter((folder) => !folder.name.startsWith("_"))
  .filter((folder) => !folder.name.startsWith("("))
  .map((folder) => folder.name);

const resolveBaseUrl = () => {
  const raw =
    env.NEXT_PUBLIC_WEB_URL ??
    env.VERCEL_PROJECT_PRODUCTION_URL ??
    env.VERCEL_URL ??
    "http://localhost:2222";
  const normalized = raw.startsWith("http") ? raw : `https://${raw}`;
  return new URL(normalized);
};

const toSlugs = (posts: unknown[]) =>
  posts
    .filter((post) => post && typeof post === "object")
    .map((post) => (post as { _sys?: { filename?: string } })._sys?.filename)
    .filter((slug): slug is string => Boolean(slug));

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const url = resolveBaseUrl();
  const [blogPosts, legalPosts] = await Promise.all([
    blog.getPosts().catch(() => []),
    legal.getPosts().catch(() => []),
  ]);
  const blogs = Array.isArray(blogPosts) ? toSlugs(blogPosts) : [];
  const legals = Array.isArray(legalPosts) ? toSlugs(legalPosts) : [];

  return [
    {
      url: new URL("/", url).href,
      lastModified: new Date(),
    },
    ...pages.map((page) => ({
      url: new URL(page, url).href,
      lastModified: new Date(),
    })),
    ...blogs.map((slug) => ({
      url: new URL(`blog/${slug}`, url).href,
      lastModified: new Date(),
    })),
    ...legals.map((slug) => ({
      url: new URL(`legal/${slug}`, url).href,
      lastModified: new Date(),
    })),
  ];
};

export default sitemap;
