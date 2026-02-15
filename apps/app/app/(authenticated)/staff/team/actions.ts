"use server";

import { auth, currentUser } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { InvariantError, invariant } from "../../../lib/invariant";
import { getTenantIdForOrg } from "../../../lib/tenant";
import {
  type EmploymentTypeValue,
  employmentTypeOptions,
  type RoleValue,
  roleOptions,
} from "./constants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_VALUES = roleOptions.map((option) => option.value);
const EMPLOYMENT_VALUES = employmentTypeOptions.map((option) => option.value);

export interface ActionState {
  status: "idle" | "error" | "success";
  message?: string;
}

const readText = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const resolveRole = (value: string): RoleValue => {
  if (ROLE_VALUES.includes(value as RoleValue)) {
    return value as RoleValue;
  }
  return "staff";
};

const resolveEmploymentType = (value: string): EmploymentTypeValue => {
  if (EMPLOYMENT_VALUES.includes(value as EmploymentTypeValue)) {
    return value as EmploymentTypeValue;
  }
  return "full_time";
};

/**
 * Sync current user from Clerk into the CURRENT tenant.
 *
 * authUserId is @@unique([tenantId, authUserId]) so the same Clerk user
 * can be an employee in multiple orgs simultaneously.
 */
export const syncCurrentUser = async (): Promise<ActionState> => {
  try {
    const { orgId, userId } = await auth();
    if (!orgId) return { status: "error", message: "No orgId — are you signed in to an org?" };
    if (!userId) return { status: "error", message: "No userId from Clerk auth." };

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return { status: "error", message: `No tenant for org ${orgId}` };

    const clerkUser = await currentUser();
    const clerkEmail =
      clerkUser?.emailAddresses.at(0)?.emailAddress?.toLowerCase() ?? null;
    const clerkFirstName = clerkUser?.firstName ?? "";
    const clerkLastName = clerkUser?.lastName ?? "";

    if (!clerkEmail) {
      return { status: "error", message: "No email found in Clerk account." };
    }

    console.log("[syncCurrentUser]", { orgId, userId, tenantId, clerkEmail });

    // 0. Reclaim any soft-deleted record that holds our authUserId in this tenant.
    //    The unique index (tenant_id, auth_user_id) includes deleted rows,
    //    so we must clear or restore them before linking.
    const ghostRecord = await database.user.findFirst({
      where: { tenantId, authUserId: userId, deletedAt: { not: null } },
      select: { id: true, email: true },
    });
    if (ghostRecord) {
      // Restore the soft-deleted record — it's ours.
      await database.user.update({
        where: { tenantId_id: { tenantId, id: ghostRecord.id } },
        data: {
          deletedAt: null,
          isActive: true,
          email: clerkEmail,
          firstName: clerkFirstName || "Unknown",
          lastName: clerkLastName || "User",
        },
      });
      revalidatePath("/staff/team");
      return { status: "success", message: "Your account has been restored." };
    }

    // 1. Already linked in this tenant? Done.
    const linked = await database.user.findFirst({
      where: { tenantId, authUserId: userId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (linked) {
      return { status: "success", message: `Linked as ${linked.role}.` };
    }

    // 2. Employee exists by email but not linked? Link them.
    //    First clear any soft-deleted record holding the same email
    //    (won't conflict with unique index since email isn't uniquely indexed alone).
    const byEmail = await database.user.findFirst({
      where: { tenantId, email: clerkEmail, deletedAt: null },
      select: { id: true },
    });

    if (byEmail) {
      await database.user.update({
        where: { tenantId_id: { tenantId, id: byEmail.id } },
        data: { authUserId: userId },
      });
      revalidatePath("/staff/team");
      return { status: "success", message: "Your account has been linked." };
    }

    // 3. No record at all — create fresh employee.
    console.log("[syncCurrentUser] Creating new employee for", clerkEmail);
    await database.user.create({
      data: {
        tenantId,
        email: clerkEmail,
        firstName: clerkFirstName || "Unknown",
        lastName: clerkLastName || "User",
        role: "admin",
        employmentType: "full_time",
        authUserId: userId,
      },
    });

    revalidatePath("/staff/team");
    return { status: "success", message: "Welcome! You're now registered as admin." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[syncCurrentUser] FAILED:", msg, error);
    return { status: "error", message: `Sync failed: ${msg}` };
  }
};

export const addStaffMember = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const { orgId, userId } = await auth();
    invariant(orgId, "You must be signed in to add staff.");

    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, "Tenant not found for this organization.");

    const email = readText(formData, "email").toLowerCase();
    const firstName = readText(formData, "firstName");
    const lastName = readText(formData, "lastName");
    const role = resolveRole(readText(formData, "role"));
    const employmentType = resolveEmploymentType(
      readText(formData, "employmentType")
    );

    invariant(email, "Email is required.");
    invariant(EMAIL_PATTERN.test(email), "Enter a valid email address.");
    invariant(firstName, "First name is required.");
    invariant(lastName, "Last name is required.");

    const existing = await database.user.findFirst({
      where: {
        tenantId,
        email,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    invariant(!existing, "A staff member with this email already exists.");

    // Simple create - no Clerk linking
    await database.user.create({
      data: {
        tenantId,
        email,
        firstName,
        lastName,
        role,
        employmentType,
      },
    });

    revalidatePath("/staff/team");

    return {
      status: "success",
      message: "Staff member added.",
    };
  } catch (error) {
    if (error instanceof InvariantError) {
      return { status: "error", message: error.message };
    }

    console.error("Failed to add staff member:", error);
    return {
      status: "error",
      message: "Something went wrong while adding staff.",
    };
  }
};

export const updateStaffMember = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const { orgId } = await auth();
    invariant(orgId, "You must be signed in to update staff.");

    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, "Tenant not found for this organization.");

    const id = readText(formData, "id");
    const email = readText(formData, "email").toLowerCase();
    const firstName = readText(formData, "firstName");
    const lastName = readText(formData, "lastName");
    const role = resolveRole(readText(formData, "role"));
    const employmentType = resolveEmploymentType(
      readText(formData, "employmentType")
    );
    const isActive = formData.get("isActive") === "true";

    invariant(id, "Staff ID is required.");
    invariant(email, "Email is required.");
    invariant(EMAIL_PATTERN.test(email), "Enter a valid email address.");
    invariant(firstName, "First name is required.");
    invariant(lastName, "Last name is required.");

    // Check employee exists
    const existing = await database.user.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    invariant(existing, "Staff member not found.");

    await database.user.update({
      where: {
        tenantId_id: { tenantId, id },
      },
      data: {
        email,
        firstName,
        lastName,
        role,
        employmentType,
        isActive,
      },
    });

    revalidatePath("/staff/team");

    return {
      status: "success",
      message: "Staff member updated.",
    };
  } catch (error) {
    if (error instanceof InvariantError) {
      return { status: "error", message: error.message };
    }

    console.error("Failed to update staff member:", error);
    return {
      status: "error",
      message: "Something went wrong while updating staff.",
    };
  }
};

export const deleteStaffMember = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const { orgId } = await auth();
    invariant(orgId, "You must be signed in to delete staff.");

    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, "Tenant not found for this organization.");

    const id = readText(formData, "id");

    invariant(id, "Staff ID is required.");

    // Check employee exists
    const existing = await database.user.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    invariant(existing, "Staff member not found.");

    // Soft delete - set deletedAt
    await database.user.update({
      where: {
        tenantId_id: { tenantId, id },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    revalidatePath("/staff/team");

    return {
      status: "success",
      message: "Staff member deleted.",
    };
  } catch (error) {
    if (error instanceof InvariantError) {
      return { status: "error", message: error.message };
    }

    console.error("Failed to delete staff member:", error);
    return {
      status: "error",
      message: "Something went wrong while deleting staff.",
    };
  }
};
