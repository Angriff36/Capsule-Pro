Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata =
  exports.generateStaticParams =
  exports.dynamicParams =
    void 0;
const page_1 = require("fumadocs-ui/layouts/docs/page");
const mdx_1 = require("fumadocs-ui/mdx");
const navigation_1 = require("next/navigation");
const source_1 = require("@/lib/source");
const mdx_components_1 = require("@/mdx-components");
exports.dynamicParams = false;
const generateStaticParams = () => source_1.source.generateParams();
exports.generateStaticParams = generateStaticParams;
const generateMetadata = async (props) => {
  const params = await props.params;
  const page = source_1.source.getPage(params.slug ?? []);
  if (!page) {
    return {};
  }
  return {
    title: page.data.title,
    description: page.data.description,
  };
};
exports.generateMetadata = generateMetadata;
const DocsPageRoute = async (props) => {
  const params = await props.params;
  const page = source_1.source.getPage(params.slug ?? []);
  if (!page) {
    (0, navigation_1.notFound)();
  }
  const { body: MdxContent, toc } = page.data;
  return (
    <page_1.DocsPage toc={toc}>
      <page_1.DocsTitle>{page.data.title}</page_1.DocsTitle>
      {page.data.description ? (
        <page_1.DocsDescription>{page.data.description}</page_1.DocsDescription>
      ) : null}
      <page_1.DocsBody>
        <MdxContent
          components={(0, mdx_components_1.getMDXComponents)({
            a: (0, mdx_1.createRelativeLink)(source_1.source, page),
          })}
        />
      </page_1.DocsBody>
    </page_1.DocsPage>
  );
};
exports.default = DocsPageRoute;
