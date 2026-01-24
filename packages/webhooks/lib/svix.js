Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppPortal = exports.send = void 0;
require("server-only");
const server_1 = require("@repo/auth/server");
const svix_1 = require("svix");
const keys_1 = require("../keys");
const svixToken = (0, keys_1.keys)().SVIX_TOKEN;
const send = async (eventType, payload) => {
  if (!svixToken) {
    throw new Error("SVIX_TOKEN is not set");
  }
  const svix = new svix_1.Svix(svixToken);
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return;
  }
  return svix.message.create(orgId, {
    eventType,
    payload: {
      eventType,
      ...payload,
    },
    application: {
      name: orgId,
      uid: orgId,
    },
  });
};
exports.send = send;
const getAppPortal = async () => {
  if (!svixToken) {
    throw new Error("SVIX_TOKEN is not set");
  }
  const svix = new svix_1.Svix(svixToken);
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return;
  }
  return svix.authentication.appPortalAccess(orgId, {
    application: {
      name: orgId,
      uid: orgId,
    },
  });
};
exports.getAppPortal = getAppPortal;
