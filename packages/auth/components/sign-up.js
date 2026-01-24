Object.defineProperty(exports, "__esModule", { value: true });
exports.SignUp = void 0;
const nextjs_1 = require("@clerk/nextjs");
const SignUp = () => (
  <nextjs_1.SignUp
    appearance={{
      elements: {
        header: "hidden",
      },
    }}
  />
);
exports.SignUp = SignUp;
