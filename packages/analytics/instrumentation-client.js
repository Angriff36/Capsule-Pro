var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAnalytics = void 0;
const posthog_js_1 = __importDefault(require("posthog-js"));
const keys_1 = require("./keys");
const initializeAnalytics = () => {
  posthog_js_1.default.init((0, keys_1.keys)().NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: (0, keys_1.keys)().NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2025-05-24",
  });
};
exports.initializeAnalytics = initializeAnalytics;
