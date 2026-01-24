var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = void 0;
require("server-only");
const stripe_1 = __importDefault(require("stripe"));
const keys_1 = require("./keys");
exports.stripe = new stripe_1.default((0, keys_1.keys)().STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});
