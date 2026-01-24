Object.defineProperty(exports, "__esModule", { value: true });
exports.createFlag = void 0;
const server_1 = require("@repo/analytics/server");
const server_2 = require("@repo/auth/server");
const next_1 = require("flags/next");
const createFlag = (key) =>
  (0, next_1.flag)({
    key,
    defaultValue: false,
    async decide() {
      const { userId } = await (0, server_2.auth)();
      if (!userId) {
        return this.defaultValue;
      }
      const isEnabled = await server_1.analytics.isFeatureEnabled(key, userId);
      return isEnabled ?? this.defaultValue;
    },
  });
exports.createFlag = createFlag;
