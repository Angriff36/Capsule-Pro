Object.defineProperty(exports, "__esModule", { value: true });
exports.source = void 0;
const server_1 = require("fumadocs-mdx:collections/server");
const source_1 = require("fumadocs-core/source");
exports.source = (0, source_1.loader)({
  baseUrl: "/docs",
  source: server_1.docs.toFumadocsSource(),
});
