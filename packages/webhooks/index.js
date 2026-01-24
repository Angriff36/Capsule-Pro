Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooks = void 0;
const svix_1 = require("./lib/svix");
exports.webhooks = {
  send: svix_1.send,
  getAppPortal: svix_1.getAppPortal,
};
