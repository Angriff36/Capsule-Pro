Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
require("server-only");
const node_1 = require("@liveblocks/node");
const keys_1 = require("./keys");
const secret = (0, keys_1.keys)().LIVEBLOCKS_SECRET;
const authenticate = async ({ userId, orgId, userInfo }) => {
  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET is not set");
  }
  const liveblocks = new node_1.Liveblocks({ secret });
  // Start an auth session inside your endpoint
  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      ...userInfo,
      color:
        typeof userInfo?.color === "string" && userInfo.color
          ? userInfo.color
          : "#" +
            Math.floor(Math.random() * 16_777_215)
              .toString(16)
              .padStart(6, "0"),
    },
  });
  // Use a naming pattern to allow access to rooms with wildcards
  // Giving the user write access on their organization
  session.allow(`${orgId}:*`, session.FULL_ACCESS);
  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new Response(body, { status });
};
exports.authenticate = authenticate;
