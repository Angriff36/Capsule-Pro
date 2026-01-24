var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticParams = exports.generateMetadata = void 0;
const react_icons_1 = require("@radix-ui/react-icons");
const cms_1 = require("@repo/cms");
const body_1 = require("@repo/cms/components/body");
const feed_1 = require("@repo/cms/components/feed");
const toc_1 = require("@repo/cms/components/toc");
const metadata_1 = require("@repo/seo/metadata");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const sidebar_1 = require("@/components/sidebar");
const generateMetadata = async ({ params }) => {
  const { slug } = await params;
  const post = await cms_1.legal.getPost(slug);
  if (!post) {
    return {};
  }
  return (0, metadata_1.createMetadata)({
    title: post._title,
    description: post._title,
  });
};
exports.generateMetadata = generateMetadata;
const generateStaticParams = async () => {
  const posts = await cms_1.legal.getPosts();
  return posts.map(({ _slug }) => ({ slug: _slug }));
};
exports.generateStaticParams = generateStaticParams;
const LegalPage = async ({ params }) => {
  const { slug } = await params;
  return (
    <feed_1.Feed queries={[cms_1.legal.postQuery(slug)]}>
      {/* biome-ignore lint/suspicious/useAwait: "Server Actions must be async" */}
      {async ([data]) => {
        "use server";
        const page = data._componentInstances.legalPagesItem.item;
        if (!page) {
          (0, navigation_1.notFound)();
        }
        return (
          <div className="container max-w-5xl py-16">
            <link_1.default
              className="mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm focus:underline focus:outline-none"
              href="/"
            >
              <react_icons_1.ArrowLeftIcon className="h-4 w-4" />
              Back to Home
            </link_1.default>
            <h1 className="scroll-m-20 text-balance font-extrabold text-4xl tracking-tight lg:text-5xl">
              {page._title}
            </h1>
            <p className="text-balance leading-7 [&:not(:first-child)]:mt-6">
              {page._title}
            </p>
            <div className="mt-16 flex flex-col items-start gap-8 sm:flex-row">
              <div className="sm:flex-1">
                <div className="prose prose-neutral dark:prose-invert">
                  {page.body ? (
                    <body_1.Body content={page.body.json.content} />
                  ) : null}
                </div>
              </div>
              <div className="sticky top-24 hidden shrink-0 md:block">
                <sidebar_1.Sidebar
                  date={new Date()}
                  readingTime={
                    page.body
                      ? `${page.body.readingTime} min read`
                      : "0 min read"
                  }
                  toc={
                    page.body ? (
                      <toc_1.TableOfContents data={page.body.json.toc} />
                    ) : null
                  }
                />
              </div>
            </div>
          </div>
        );
      }}
    </feed_1.Feed>
  );
};
exports.default = LegalPage;
