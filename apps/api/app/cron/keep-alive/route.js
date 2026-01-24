Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const database_1 = require("@repo/database");
const GET = async () => {
  // Simple keep-alive query - count tenants to keep database connection active
  await database_1.database.tenant.count();
  return new Response("OK", { status: 200 });
};
exports.GET = GET;
