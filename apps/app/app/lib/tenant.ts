import "server-only";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { invariant } from "./invariant";

const CONNECTION_ERROR_PATTERN =
  /connection terminated|connection refused|ECONNREFUSED|ENOTFOUND|connect/i;

export const getTenantIdForOrg = async (orgId: string): Promise<string> => {
  invariant(orgId, "orgId must exist to resolve tenant");
  try {
    let account = await database.account.findFirst({
      where: { slug: orgId, deletedAt: null },
    });

    if (!account) {
      account = await database.account.create({
        data: {
          name: orgId,
          slug: orgId,
        },
      });
    }

    return account.id;
  } catch (err) {
    // Log the real error in the terminal (next dev server) so we see what’s actually failing
    const raw =
      err instanceof Error
        ? `${err.name}: ${err.message}${err.cause ? ` (cause: ${String(err.cause)})` : ""}`
        : String(err);
    console.error("[getTenantIdForOrg] DB error:", raw);
    const errWithCode = err as { code?: string };
    if (err instanceof Error && errWithCode.code) {
      console.error("[getTenantIdForOrg] code:", errWithCode.code);
    }

    const msg =
      err instanceof Error ? err.message : String(err ?? "Unknown error");
    if (CONNECTION_ERROR_PATTERN.test(msg)) {
      throw new Error(
        `Database connection failed (${msg}). See server logs for full error.`
      );
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const requireTenantId = async (): Promise<string> => {
  const { orgId } = await auth();

  invariant(orgId, "auth.orgId must exist");

  return getTenantIdForOrg(orgId);
};

// Alias for backward compatibility with existing code using getTenantId
export const getTenantId = requireTenantId;
