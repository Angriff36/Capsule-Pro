Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
var server_1 = require("@clerk/nextjs/server");
Object.defineProperty(exports, "authMiddleware", {
  enumerable: true,
  get() {
    return server_1.clerkMiddleware;
  },
});
