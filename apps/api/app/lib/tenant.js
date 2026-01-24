Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenantId = exports.getTenantIdForOrg = void 0;
require("server-only");
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const invariant_1 = require("./invariant");
const getTenantIdForOrg = async (orgId) => {
  (0, invariant_1.invariant)(orgId, "orgId must exist to resolve tenant");
  // Get or create account by slug
  let account = await database_1.database.account.findFirst({
    where: { slug: orgId, deletedAt: null },
  });
  if (!account) {
    // Create new account if it doesn't exist
    account = await database_1.database.account.create({
      data: {
        name: orgId,
        slug: orgId,
      },
    });
  }
  return account.id;
};
exports.getTenantIdForOrg = getTenantIdForOrg;
const requireTenantId = async () => {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "auth.orgId must exist");
  return (0, exports.getTenantIdForOrg)(orgId);
};
exports.requireTenantId = requireTenantId;
