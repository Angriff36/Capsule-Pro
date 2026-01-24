Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
    testTimeout: 10_000,
  },
});
