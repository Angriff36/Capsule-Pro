/**
 * Channel naming utilities exports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseChannelName =
  exports.isValidTenantChannel =
  exports.getModuleFromEventType =
  exports.getChannelName =
    void 0;
var naming_1 = require("./naming");
Object.defineProperty(exports, "getChannelName", {
  enumerable: true,
  get() {
    return naming_1.getChannelName;
  },
});
Object.defineProperty(exports, "getModuleFromEventType", {
  enumerable: true,
  get() {
    return naming_1.getModuleFromEventType;
  },
});
Object.defineProperty(exports, "isValidTenantChannel", {
  enumerable: true,
  get() {
    return naming_1.isValidTenantChannel;
  },
});
Object.defineProperty(exports, "parseChannelName", {
  enumerable: true,
  get() {
    return naming_1.parseChannelName;
  },
});
