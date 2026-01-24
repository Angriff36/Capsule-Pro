Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticParams = exports.generateMetadata = void 0;
const navigation_1 = require("next/navigation");
const generateMetadata = async () => {
  // Blog disabled -> no per-post metadata
  return {};
};
exports.generateMetadata = generateMetadata;
const generateStaticParams = async () => {
  // Blog disabled -> no static params
  return [];
};
exports.generateStaticParams = generateStaticParams;
const BlogPost = async ({ params }) => {
  // Keep the route valid, but always 404 so you don't ship broken pages.
  // If you'd rather show a friendly message instead of 404, remove notFound()
  // and render a placeholder like the index page.
  await params;
  (0, navigation_1.notFound)();
};
exports.default = BlogPost;
