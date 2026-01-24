Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsAgentToolkit = void 0;
const ai_sdk_1 = require("@stripe/agent-toolkit/ai-sdk");
const keys_1 = require("./keys");
exports.paymentsAgentToolkit = new ai_sdk_1.StripeAgentToolkit({
  secretKey: (0, keys_1.keys)().STRIPE_SECRET_KEY,
  configuration: {
    actions: {
      paymentLinks: {
        create: true,
      },
      products: {
        create: true,
      },
      prices: {
        create: true,
      },
    },
  },
});
