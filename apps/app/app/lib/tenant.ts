import "server-only";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";

export const getTenantIdForOrg = async (orgId: string): Promise<string> => {
  // Get or create account by slug
  let account = await database.account.findFirst({
    where: { slug: orgId, deletedAt: null },
  });

  if (!account) {
    // Create new account if it doesn't exist
    account = await database.account.create({
      data: {
        name: orgId,
        slug: orgId,
      },
    });
  }

  return account.id;
};

export const requireTenantId = async (): Promise<string> => {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  return getTenantIdForOrg(orgId);
};
