var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const metadata_1 = require("@repo/seo/metadata");
const dynamic_1 = __importDefault(require("next/dynamic"));
const title = "Welcome back";
const description = "Enter your details to sign in.";
const SignIn = (0, dynamic_1.default)(() =>
  import("@repo/auth/components/sign-in").then((mod) => mod.SignIn)
);
exports.metadata = (0, metadata_1.createMetadata)({ title, description });
const SignInPage = () => <SignIn />;
exports.default = SignInPage;
