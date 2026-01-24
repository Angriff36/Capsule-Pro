var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = void 0;
const internationalization_1 = require("@repo/internationalization");
const metadata_1 = require("@repo/seo/metadata");
const link_1 = __importDefault(require("next/link"));
const generateMetadata = async ({ params }) => {
  const { locale } = await params;
  const dictionary = await (0, internationalization_1.getDictionary)(locale);
  // Reuse your existing localized metadata shape if it exists.
  // If dictionary.web.blog.meta is missing, this will throw — in that case,
  // change this to a simple hardcoded createMetadata({ title: "...", ... }).
  return (0, metadata_1.createMetadata)(dictionary.web.blog.meta);
};
exports.generateMetadata = generateMetadata;
const BlogIndex = async ({ params }) => {
  const { locale } = await params;
  const dictionary = await (0, internationalization_1.getDictionary)(locale);
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
          <link_1.default
            className="text-sm underline underline-offset-4"
            href="/"
          >
            Back to home
          </link_1.default>
        </div>
      </div>
    </div>
  );
};
exports.default = BlogIndex;
