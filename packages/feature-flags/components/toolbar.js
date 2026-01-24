Object.defineProperty(exports, "__esModule", { value: true });
exports.Toolbar = void 0;
const next_1 = require("@vercel/toolbar/next");
const keys_1 = require("../keys");
const Toolbar = () =>
  (0, keys_1.keys)().FLAGS_SECRET ? <next_1.VercelToolbar /> : null;
exports.Toolbar = Toolbar;
