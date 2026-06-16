import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Actor context injected into generated mutations (replaces `(ctx as any).auth`). */
export type MutationAuth = {
  id: string;
  role: string;
  tenantId: string;
  clerkId?: string;
};

type AuthCtx = QueryCtx | MutationCtx;

function claimString(identity: Record<string, unknown>, key: string): string | undefined {
  const v = identity[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Resolve Clerk JWT identity → domain actor for policy checks in generated mutations.
 * Claims expected on the "convex" Clerk JWT template: role, tenant_id, user_db_id.
 */
export async function resolveMutationAuth(ctx: AuthCtx): Promise<MutationAuth> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return { id: "", role: "", tenantId: "" };
  }

  const claims = identity as unknown as Record<string, unknown>;
  const tenantId =
    claimString(claims, "tenant_id") ??
    claimString(claims, "tenantId") ??
    claimString(claims, "org_id") ??
    "";
  const role = claimString(claims, "role") ?? "admin";
  const id = claimString(claims, "user_db_id") ?? identity.subject;

  return {
    id,
    role,
    tenantId,
    clerkId: identity.subject,
  };
}
