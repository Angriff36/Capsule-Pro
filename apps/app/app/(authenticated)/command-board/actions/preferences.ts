"use server";

import { auth } from "@clerk/nextjs/server";
import { db, type Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";

/**
 * User preference interfaces
 */
export interface UserPreference {
  id: string;
  preferenceKey: string;
  preferenceValue: unknown;
  category: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveUserPreferenceInput {
  preferenceKey: string;
  preferenceValue: unknown;
  category?: string;
  notes?: string;
}

export interface UserPreferenceResult {
  success: boolean;
  data?: UserPreference;
  error?: string;
}

export interface UserPreferencesListResult {
  success: boolean;
  preferences?: UserPreference[];
  error?: string;
}

/**
 * Get all preferences for the current user, optionally filtered by category
 */
export async function getUserPreferences(
  category?: string
): Promise<UserPreferencesListResult> {
  const { userId, sessionClaims } = await auth();
  const tenantId = sessionClaims?.tenantId as string | undefined;

  if (!(userId && tenantId)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const preferences = await db.userPreference.findMany({
      where: {
        tenantId,
        userId,
        deletedAt: null,
        ...(category ? { category } : {}),
      },
      orderBy: [
        { category: "asc" },
        { preferenceKey: "asc" },
      ],
      select: {
        id: true,
        preferenceKey: true,
        preferenceValue: true,
        category: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      preferences: preferences.map((pref) => ({
        id: pref.id,
        preferenceKey: pref.preferenceKey,
        preferenceValue: pref.preferenceValue,
        category: pref.category,
        notes: pref.notes,
        createdAt: pref.createdAt,
        updatedAt: pref.updatedAt,
      })),
    };
  } catch (error) {
    console.error("Failed to fetch user preferences:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user preferences",
    };
  }
}

/**
 * Get a specific preference by key
 */
export async function getUserPreference(
  preferenceKey: string
): Promise<UserPreferenceResult> {
  const { userId, sessionClaims } = await auth();
  const tenantId = sessionClaims?.tenantId as string | undefined;

  if (!(userId && tenantId)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const preference = await db.userPreference.findFirst({
      where: {
        tenantId,
        userId,
        preferenceKey,
        deletedAt: null,
      },
      select: {
        id: true,
        preferenceKey: true,
        preferenceValue: true,
        category: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!preference) {
      return { success: false, error: "Preference not found" };
    }

    return {
      success: true,
      data: {
        id: preference.id,
        preferenceKey: preference.preferenceKey,
        preferenceValue: preference.preferenceValue,
        category: preference.category,
        notes: preference.notes,
        createdAt: preference.createdAt,
        updatedAt: preference.updatedAt,
      },
    };
  } catch (error) {
    console.error("Failed to fetch user preference:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user preference",
    };
  }
}

/**
 * Create or update a user preference
 */
export async function saveUserPreference(
  input: SaveUserPreferenceInput
): Promise<UserPreferenceResult> {
  const { userId, sessionClaims } = await auth();
  const tenantId = sessionClaims?.tenantId as string | undefined;

  if (!(userId && tenantId)) {
    return { success: false, error: "Unauthorized" };
  }

  const { preferenceKey, preferenceValue, category, notes } = input;

  if (!preferenceKey || preferenceValue === undefined) {
    return { success: false, error: "preferenceKey and preferenceValue are required" };
  }

  try {
    // Use upsert pattern - check if exists, then create or update
    const existing = await db.userPreference.findFirst({
      where: {
        tenantId,
        userId,
        preferenceKey,
        deletedAt: null,
      },
    });

    if (existing) {
      // Update existing preference
      const updated = await db.userPreference.update({
        where: {
          id: existing.id,
        },
        data: {
          preferenceValue: preferenceValue as Prisma.InputJsonValue,
          category: category || null,
          notes: notes || null,
        },
      });

      revalidatePath("/command-board");

      return {
        success: true,
        data: {
          id: updated.id,
          preferenceKey: updated.preferenceKey,
          preferenceValue: updated.preferenceValue,
          category: updated.category,
          notes: updated.notes,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      };
    } else {
      // Create new preference
      const created = await db.userPreference.create({
        data: {
          tenantId,
          userId,
          preferenceKey,
          preferenceValue: preferenceValue as Prisma.InputJsonValue,
          category: category || null,
          notes: notes || null,
        },
      });

      revalidatePath("/command-board");

      return {
        success: true,
        data: {
          id: created.id,
          preferenceKey: created.preferenceKey,
          preferenceValue: created.preferenceValue,
          category: created.category,
          notes: created.notes,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      };
    }
  } catch (error) {
    console.error("Failed to save user preference:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save user preference",
    };
  }
}

/**
 * Delete (soft-delete) a user preference
 */
export async function deleteUserPreference(
  preferenceKey: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, sessionClaims } = await auth();
  const tenantId = sessionClaims?.tenantId as string | undefined;

  if (!(userId && tenantId)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Soft delete by setting deletedAt
    const updated = await db.userPreference.updateMany({
      where: {
        tenantId,
        userId,
        preferenceKey,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    revalidatePath("/command-board");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete user preference:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete user preference",
    };
  }
}
