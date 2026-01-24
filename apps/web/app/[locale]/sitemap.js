var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const cms_1 = require("@repo/cms");
const env_1 = require("@/env");
const appFolders = node_fs_1.default.readdirSync("app", {
  withFileTypes: true,
});
const pages = appFolders
  .filter((file) => file.isDirectory())
  .filter((folder) => !folder.name.startsWith("_"))
  .filter((folder) => !folder.name.startsWith("("))
  .map((folder) => folder.name);
const resolveBaseUrl = () => {
  const raw =
    env_1.env.NEXT_PUBLIC_WEB_URL ??
    env_1.env.VERCEL_PROJECT_PRODUCTION_URL ??
    env_1.env.VERCEL_URL ??
    "http://localhost:2222";
  const normalized = raw.startsWith("http") ? raw : `https://${raw}`;
  return new URL(normalized);
};
const toSlugs = (posts) =>
  posts
    .filter((post) => post && typeof post === "object")
    .map((post) => post._sys?.filename)
    .filter((slug) => Boolean(slug));
const sitemap = async () => {
  const url = resolveBaseUrl();
  const [blogPosts, legalPosts] = await Promise.all([
    cms_1.blog.getPosts().catch(() => []),
    cms_1.legal.getPosts().catch(() => []),
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
exports.default = sitemap;
