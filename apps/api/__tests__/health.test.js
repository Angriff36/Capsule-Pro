Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const route_1 = require("../app/health/route");
(0, vitest_1.test)("Health Check", async () => {
  const response = await (0, route_1.GET)();
  (0, vitest_1.expect)(response.status).toBe(200);
  (0, vitest_1.expect)(await response.text()).toBe("OK");
});
