/**
 * Menu publication lifecycle labels and helpers.
 * Manifest owns draft → published → archived; isActive is a side effect.
 */

import type { ConstraintOutcome } from "@repo/design-system/components/constraint-override-dialog";

export type MenuLifecycleStatus = "draft" | "published" | "archived";

export interface MenuLifecycleActionResult {
  constraintOutcomes?: ConstraintOutcome[];
  error?: string;
  isActive?: boolean;
  menuId?: string;
  name?: string;
  success: boolean;
}

export function normalizeMenuStatus(
  value: string | null | undefined
): MenuLifecycleStatus {
  if (value === "published" || value === "archived") {
    return value;
  }
  return "draft";
}

export function menuStatusLabel(status: MenuLifecycleStatus): string {
  switch (status) {
    case "published":
      return "Published";
    case "archived":
      return "Archived";
    default:
      return "Draft";
  }
}
