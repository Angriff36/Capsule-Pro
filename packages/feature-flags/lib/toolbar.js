Object.defineProperty(exports, "__esModule", { value: true });
exports.withToolbar = void 0;
const next_1 = require("@vercel/toolbar/plugins/next");
const keys_1 = require("../keys");
const withToolbar = (config) =>
  (0, keys_1.keys)().FLAGS_SECRET
    ? (0, next_1.withVercelToolbar)()(config)
    : config;
exports.withToolbar = withToolbar;
