var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const page_1 = __importDefault(
  require("../app/(unauthenticated)/sign-in/[[...sign-in]]/page")
);
(0, vitest_1.test)("Sign In Page", () => {
  const { container } = (0, react_1.render)(<page_1.default />);
  (0, vitest_1.expect)(container).toBeDefined();
});
