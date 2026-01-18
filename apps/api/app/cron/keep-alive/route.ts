import { database } from "@repo/database";

export const GET = async () => {
  // Simple keep-alive query - count tenants to keep database connection active
  await database.tenant.count();

  return new Response("OK", { status: 200 });
};
