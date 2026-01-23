import "server-only";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { invariant } from "./invariant";

export const getTenantIdForOrg = async (orgId: string): Promise<string> => {
  invariant(orgId, "orgId must exist to resolve tenant");
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

  invariant(orgId, "auth.orgId must exist");

  return getTenantIdForOrg(orgId);
};

// Alias for backward compatibility with existing code using getTenantId
export const getTenantId = requireTenantId;
