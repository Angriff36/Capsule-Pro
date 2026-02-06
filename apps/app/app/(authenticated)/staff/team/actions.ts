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

    const clerkUser = await currentUser();
    const clerkEmail =
      clerkUser?.emailAddresses.at(0)?.emailAddress?.toLowerCase() ?? null;
    const authUserId = clerkEmail === email ? userId : null;

    await database.user.create({
      data: {
        tenantId,
        email,
        firstName,
        lastName,
        role,
        employmentType,
        authUserId,
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
