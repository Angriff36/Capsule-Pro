Object.defineProperty(exports, "__esModule", { value: true });
exports.analytics = void 0;
var posthog_js_1 = require("posthog-js");
Object.defineProperty(exports, "analytics", {
  enumerable: true,
  get() {
    return posthog_js_1.posthog;
  },
});
