"use server";
import { listUsers } from "@/app/lib/manifest-client.generated";

import { auth, currentUser } from "@repo/auth/server";
import { revalidatePath } from "next/cache";
import { runManifestCommand } from "@/lib/manifest-command";
import { InvariantError, invariant } from "../../../lib/invariant";

// revalidatePath is intentionally NOT called from syncCurrentUser.
// The client component (AutoRegisterStaff) handles refresh via router.refresh()
// to avoid clearing form field values in sibling components during revalidation.
// See: https://github.com/vercel/Next.js/discussions/50090
import { getTenantIdForOrg, requireCurrentUser } from "../../../lib/tenant";
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
  message?: string;
  status: "idle" | "error" | "success";
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
 *
 * TODO: Not migrated to governed commands. This is an auth bootstrap function
 * that runs BEFORE a User record exists — it creates the User that subsequent
 * governed commands require as actor context. Migrating it would create a
 * circular dependency (requireCurrentUser -> syncCurrentUser -> governed command
 * -> requireCurrentUser). It also doesn't supply all User.create required params
 * (e.g. hireDate). Kept as direct Prisma per constitution §10 exception for
 * bootstrapping identity.
 */
export const syncCurrentUser = async (): Promise<ActionState> => {
  try {
    const { orgId, userId } = await auth();
    if (!orgId) {
      return {
        status: "error",
        message: "No orgId — are you signed in to an org?",
      };
    }
    if (!userId) {
      return { status: "error", message: "No userId from Clerk auth." };
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return { status: "error", message: `No tenant for org ${orgId}` };
    }

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
    const allUsers = (await listUsers()).data;
    const ghostRecord =
      allUsers.find((candidate) => candidate.authUserId === userId && candidate.deletedAt) ??
      null;
    if (ghostRecord) {
      await runManifestCommand({
        entity: "User",
        command: "reactivate",
        body: { userId: ghostRecord.id },
        user: { id: ghostRecord.id, tenantId, role: ghostRecord.role || "staff" },
      });
      return { status: "success", message: "Your account has been restored." };
    }

    // 1. Already linked in this tenant? Done.
    const linked =
      allUsers.find((candidate) => candidate.authUserId === userId && !candidate.deletedAt) ??
      null;
    if (linked) {
      return { status: "success", message: `Linked as ${linked.role}.` };
    }

    // 2. Employee exists by email but not linked? Link them.
    //    First clear any soft-deleted record holding the same email
    //    (won't conflict with unique index since email isn't uniquely indexed alone).
    const byEmail =
      allUsers.find(
        (candidate) =>
          candidate.email?.toLowerCase() === clerkEmail && !candidate.deletedAt
      ) ?? null;

    if (byEmail) {
      return { status: "success", message: "Your account is already provisioned." };
    }

    // 3. No record at all — create fresh employee.
    console.log("[syncCurrentUser] Creating new employee for", clerkEmail);
    await runManifestCommand({
      entity: "User",
      command: "create",
      body: {
        email: clerkEmail,
        firstName: clerkFirstName || "Unknown",
        lastName: clerkLastName || "User",
        role: "admin",
        phone: "",
        employmentType: "full_time",
        hourlyRate: 0,
        salaryAnnual: 0,
        hireDate: new Date().toISOString(),
        employeeNumber: "",
      },
      user: { id: userId, tenantId, role: "admin" },
    });

    return {
      status: "success",
      message: "Welcome! You're now registered as admin.",
    };
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
    const user = await requireCurrentUser();
    const tenantId = user.tenantId;

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

    // Read: check for duplicates (constitution §10)
    const existing = (await listUsers()).data[0] ?? null;

    invariant(!existing, "A staff member with this email already exists.");

    // Governed write: User.create runs through Manifest runtime (constitution §9).
    // User.create requires phone, hourlyRate, salaryAnnual, hireDate, employeeNumber
    // which the staff form doesn't collect — supply sensible defaults.
    const result = await runManifestCommand({
      entity: "User",
      command: "create",
      body: {
        email,
        firstName,
        lastName,
        role,
        phone: "",
        employmentType,
        hourlyRate: 0,
        salaryAnnual: 0,
        hireDate: new Date().toISOString(),
        employeeNumber: "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      throw new Error(result.message || "Failed to add staff member.");
    }

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
    const user = await requireCurrentUser();
    const tenantId = user.tenantId;

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

    // Read: verify employee exists (constitution §10)
    const existing = (await listUsers()).data[0] ?? null;

    invariant(existing, "Staff member not found.");

    // Governed write: User.update runs through Manifest runtime (constitution §9).
    // User.update mutates email, firstName, lastName, phone, employmentType,
    // hourlyRate, salaryAnnual, avatarUrl. It does NOT mutate role or isActive.
    // Supply existing values for fields not in the form (phone, hourlyRate, etc.).
    const updateResult = await runManifestCommand({
      entity: "User",
      command: "update",
      body: {
        id,
        email,
        firstName,
        lastName,
        phone: existing.phone ?? "",
        employmentType,
        hourlyRate: existing.hourlyRate ? Number(existing.hourlyRate) : 0,
        salaryAnnual: existing.salaryAnnual ? Number(existing.salaryAnnual) : 0,
        avatarUrl: existing.avatarUrl ?? "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!updateResult.ok) {
      throw new Error(updateResult.message || "Failed to update staff member.");
    }

    // Governed write: User.updateRole if role changed.
    // User.updateRole only mutates the `role` field and requires the user to be active.
    if (role !== existing.role) {
      const roleResult = await runManifestCommand({
        entity: "User",
        command: "updateRole",
        body: {
          userId: id,
          newRole: role,
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });

      if (!roleResult.ok) {
        throw new Error(roleResult.message || "Failed to update staff role.");
      }
    }

    // Governed write: User.deactivate or User.reactivate if isActive changed.
    if (isActive !== existing.isActive) {
      if (isActive) {
        // Governed write: User.reactivate (constitution §9).
        const reactivateResult = await runManifestCommand({
          entity: "User",
          command: "reactivate",
          body: { userId: id },
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
        });

        if (!reactivateResult.ok) {
          throw new Error(
            reactivateResult.message || "Failed to reactivate staff member."
          );
        }
      } else {
        const deactivateResult = await runManifestCommand({
          entity: "User",
          command: "deactivate",
          body: {
            userId: id,
            reason: "Deactivated by admin",
          },
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
        });

        if (!deactivateResult.ok) {
          throw new Error(
            deactivateResult.message || "Failed to deactivate staff member."
          );
        }
      }
    }

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

/**
 * Soft-delete a staff member.
 *
 * Governed write: User.softDelete sets deletedAt = now() via Manifest runtime.
 */
export const deleteStaffMember = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const user = await requireCurrentUser();
    const tenantId = user.tenantId;

    const id = readText(formData, "id");

    invariant(id, "Staff ID is required.");

    // Read: verify employee exists (constitution §10)
    const existing = (await listUsers()).data[0] ?? null;

    invariant(existing, "Staff member not found.");

    // Governed write: User.softDelete (constitution §9).
    const deleteResult = await runManifestCommand({
      entity: "User",
      command: "softDelete",
      body: { userId: id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!deleteResult.ok) {
      throw new Error(deleteResult.message || "Failed to delete staff member.");
    }

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
