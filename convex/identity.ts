/**
 * Bootstrap reads/writes — not governed domain mutations.
 * Clerk → Convex actor resolution when JWT claims are incomplete.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function claimString(identity: Record<string, unknown>, key: string): string | undefined {
  const value = identity[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function tenantIdFromIdentity(identity: Record<string, unknown>): string {
  return (
    claimString(identity, "org_id") ??
    claimString(identity, "tenant_id") ??
    claimString(identity, "tenantId") ??
    ""
  );
}

export const findUserByClerk = query({
  args: { tenantId: v.string(), clerkId: v.string() },
  handler: async (ctx, { tenantId, clerkId }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
    return users.find((u) => u.authUserId === clerkId && u.deletedAt == null) ?? null;
  },
});

export const ensureCurrentUser = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, { email, firstName, lastName }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const claims = identity as unknown as Record<string, unknown>;
    const tenantId = tenantIdFromIdentity(claims);
    const clerkId = identity.subject;
    if (!tenantId) {
      throw new Error("No organization context");
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const toCurrentUser = (row: (typeof users)[number]) => ({
      id: String(row._id),
      tenantId: String(row.tenantId),
      role: String(row.role),
      email: String(row.email ?? email),
      firstName: String(row.firstName),
      lastName: String(row.lastName),
    });

    const active = users.find(
      (u) => u.authUserId === clerkId && u.deletedAt == null
    );
    if (active) {
      return toCurrentUser(active);
    }

    const ghost = users.find(
      (u) => u.authUserId === clerkId && u.deletedAt != null
    );
    if (ghost) {
      const now = Date.now();
      await ctx.db.patch(ghost._id, {
        deletedAt: undefined,
        isActive: true,
        email,
        firstName,
        lastName,
        updatedAt: now,
      });
      const restored = await ctx.db.get(ghost._id);
      if (!restored) {
        throw new Error("Failed to restore user");
      }
      return toCurrentUser(restored);
    }

    const normalizedEmail = email.toLowerCase();
    const byEmail = users.find(
      (u) =>
        u.deletedAt == null &&
        !u.authUserId &&
        (u.email?.toLowerCase() ?? "") === normalizedEmail
    );
    if (byEmail) {
      await ctx.db.patch(byEmail._id, { authUserId: clerkId, updatedAt: Date.now() });
      const linked = await ctx.db.get(byEmail._id);
      if (!linked) {
        throw new Error("Failed to link user");
      }
      return toCurrentUser(linked);
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      tenantId,
      email,
      firstName,
      lastName,
      role: "admin",
      authUserId: clerkId,
      isActive: true,
      hireDate: now,
      phone: "",
      employmentType: "full_time",
      employeeNumber: "",
      hourlyRate: "0",
      salaryAnnual: "0",
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(userId);
    if (!created) {
      throw new Error("Failed to provision user");
    }
    return toCurrentUser(created);
  },
});
