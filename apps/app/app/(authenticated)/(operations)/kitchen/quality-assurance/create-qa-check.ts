/**
 * QACheck.create via the Manifest dispatcher with the real Zod contract.
 * Does not accept legacy QualityCheck fields (title, checklistItems, etc.).
 */

import { qACheckCreate } from "@/app/lib/manifest-client.generated";
import type { QACheck } from "@/app/lib/manifest-types.generated";

/** IR guard on QACheck.create — keep UI options in sync. */
export const QA_CHECK_TYPES = [
  { value: "temperature", label: "Temperature" },
  { value: "sanitation", label: "Sanitation" },
  { value: "storage", label: "Storage" },
  { value: "labeling", label: "Labeling" },
  { value: "equipment", label: "Equipment" },
] as const;

export type QACheckType = (typeof QA_CHECK_TYPES)[number]["value"];

const ALLOWED_TYPES = new Set<string>(QA_CHECK_TYPES.map((t) => t.value));

export interface CreateQACheckInput {
  checkType: string;
  inspector: string;
  location: string;
  notes?: string;
}

export type CreateQACheckResult =
  | { ok: true; check: QACheck }
  | { ok: false; error: string };

export function isAllowedQACheckType(value: string): value is QACheckType {
  return ALLOWED_TYPES.has(value);
}

export async function createQACheck(
  input: CreateQACheckInput
): Promise<CreateQACheckResult> {
  const location = input.location.trim();
  const inspector = input.inspector.trim();
  const checkType = input.checkType.trim();
  const notes = input.notes?.trim() ?? "";

  if (!location) {
    return { ok: false, error: "Location is required." };
  }
  if (!inspector) {
    return { ok: false, error: "Inspector is required." };
  }
  if (!isAllowedQACheckType(checkType)) {
    return {
      ok: false,
      error:
        "Check type must be temperature, sanitation, storage, labeling, or equipment.",
    };
  }

  try {
    const check = await qACheckCreate({
      location,
      checkType,
      inspector,
      notes,
    });

    if (!check?.id) {
      return {
        ok: false,
        error: "QA check create did not return a persisted id.",
      };
    }

    return { ok: true, check };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to create QA check.",
    };
  }
}
