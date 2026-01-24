Object.defineProperty(exports, "__esModule", { value: true });
exports.SignIn = void 0;
const nextjs_1 = require("@clerk/nextjs");
const SignIn = () => (
  <nextjs_1.SignIn
    appearance={{
      elements: {
        header: "hidden",
      },
    }}
  />
);
exports.SignIn = SignIn;
