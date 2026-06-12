/**
 * Identity Enrichment Middleware for Manifest Command Execution
 *
 * Resolves the caller's role from the database and injects it into the
 * runtime context and evaluation context. Runs at the `before-policy`
 * lifecycle hook — before policy checks, guards, and actions execute.
 *
 * This replaces the pre-engine `resolveUserRole` function that previously
 * ran before RuntimeEngine construction (manifest-runtime-factory.ts).
 * Moving role resolution into the middleware lifecycle means:
 *
 * - Role resolution runs INSIDE the Manifest command lifecycle
 * - Guards and policies can reference `context.userRole` in expressions
 * - The RBAC middleware (before-guard) sees the enriched role
 * - Identity resolution is composable with other middleware
 *
 * @packageDocumentation
 */

import type {
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
} from "@angriff36/manifest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Prisma client subset needed for user lookups. */
interface PrismaForIdentity {
  user: {
    findFirst: (args: {
      where: { id: string; tenantId: string; deletedAt: null };
      select: { role: true };
    }) => Promise<{ role: string | null } | null>;
  };
}

/** Error capture function (e.g. Sentry captureException). */
type CaptureException = (error: unknown) => void;

export interface IdentityMiddlewareOptions {
  /** Error capture function (e.g. Sentry). */
  captureException?: CaptureException;
  /** Prisma client for user role lookups. */
  prisma: PrismaForIdentity;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an identity enrichment middleware that resolves the caller's role.
 *
 * Fires at the `before-policy` lifecycle hook — after evaluation context is
 * built but before policy checks. This ensures policies and guards can
 * reference `context.userRole` and the RBAC middleware (before-guard) can
 * check role-based permissions.
 *
 * Resolution strategy:
 * 1. If role is already present in context, skip DB lookup.
 * 2. Try UUID-based lookup: prisma.user.findFirst({ id, tenantId }).
 * 3. Fall back to authUserId-based lookup (for Clerk-style IDs like user_...).
 * 4. Enrich runtimeContext.user.role for RBAC middleware.
 * 5. Return contextPatch for guard/policy expression access.
 */
export function createIdentityMiddleware(
  options: IdentityMiddlewareOptions
): Middleware {
  const { prisma, captureException } = options;

  return {
    hooks: ["before-policy"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const user = ctx.runtimeContext?.user as
        | { id?: string; tenantId?: string; role?: string }
        | undefined;

      // Skip if role is already resolved (e.g. system/internal calls
      // that provide role directly, or the factory pre-resolved it).
      if (user?.role) {
        return {};
      }

      // Skip if no user context available.
      if (!(user?.id && user?.tenantId)) {
        return {};
      }

      try {
        const role = await resolveRole(prisma, user.id, user.tenantId);

        if (role) {
          // Mutate runtimeContext so RBAC middleware (before-guard) sees
          // the role. Objects are passed by reference in JS, so this
          // mutation is visible to all subsequent middleware in the pipeline.
          user.role = role;

          // Also patch the evaluation context so guard/policy expressions
          // can reference context.userRole.
          return {
            contextPatch: {
              "context.userRole": role,
            },
          };
        }
      } catch (error) {
        // Log but don't block command execution on role resolution failure.
        // The RBAC middleware will handle the no-role case (allow-by-default
        // for unmapped entities, denial for explicitly mapped commands).
        captureException?.(error);
      }

      return {};
    },
  };
}

// ---------------------------------------------------------------------------
// Role Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a user's role from the database.
 *
 * Tries UUID-based lookup first, then falls back to authUserId lookup
 * (for Clerk-style IDs like user_...). This preserves the exact resolution
 * strategy from the original resolveUserRole function in the factory.
 */
async function resolveRole(
  prisma: PrismaForIdentity,
  userId: string,
  tenantId: string
): Promise<string | null> {
  // Clerk user IDs (e.g. user_...) are not UUIDs. Detect non-UUID format
  // and skip the UUID-based lookup to avoid poisoning Neon transactions.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId
    );

  if (isUuid) {
    try {
      const record = await prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        select: { role: true },
      });

      if (record?.role) {
        return record.role;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes("invalid input syntax for type uuid")) {
        throw error;
      }
      // "invalid input syntax for type uuid" → fall through to authUserId lookup
    }
  }

  // Lookup by authUserId for Clerk-style IDs (or as fallback for UUID lookup).
  // The double-cast is necessary because `authUserId` exists as a database column
  // but may not be exposed as a filterable field in the Prisma-generated where
  // input type. Widening to `(args: unknown) => ...` bypasses the generated type
  // narrowing while preserving the return shape.
  const byAuthUser = await (
    prisma.user.findFirst as unknown as (
      args: unknown
    ) => Promise<{ role: string | null } | null>
  )({
    where: {
      authUserId: userId,
      tenantId,
      deletedAt: null,
    },
    select: { role: true },
  });

  return byAuthUser?.role ?? null;
}
