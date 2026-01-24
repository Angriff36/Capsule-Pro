Object.defineProperty(exports, "__esModule", { value: true });
const docs_1 = require("fumadocs-ui/layouts/docs");
const source_1 = require("@/lib/source");
const Layout = ({ children }) => (
  <docs_1.DocsLayout
    nav={{ title: "Convoy Docs", url: "/" }}
    tree={source_1.source.getPageTree()}
  >
    {children}
  </docs_1.DocsLayout>
);
exports.default = Layout;
