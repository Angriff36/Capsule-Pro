export const DRAFT_METADATA_KEY = "eventBoardDraft";

export type DraftActionKind = "assign-staff" | "add-dish"; // assign-vehicle | assign-equipment need data models first

export interface DraftAction {
  entityId: string;
  entityType: string;
  kind: DraftActionKind;
  params: Record<string, string>;
}

export interface DraftEnvelope {
  committedRecordId: string | null;
  draftAction: DraftAction;
  draftState: "draft" | "committed" | "failed";
}

function isDraftEnvelope(value: unknown): value is DraftEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  const action = v.draftAction as Record<string, unknown> | undefined;
  return (
    typeof action === "object" &&
    action !== null &&
    typeof action.kind === "string" &&
    typeof action.entityId === "string" &&
    (v.draftState === "draft" ||
      v.draftState === "committed" ||
      v.draftState === "failed")
  );
}

/** Normalizes Prisma Json (string | object | null) to a plain record. */
export function normalizeMetadata(metadata: unknown): Record<string, unknown> {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata)
  ) {
    return metadata as Record<string, unknown>;
  }
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function parseDraftEnvelope(metadata: unknown): DraftEnvelope | null {
  const candidate = normalizeMetadata(metadata)[DRAFT_METADATA_KEY];
  return isDraftEnvelope(candidate) ? candidate : null;
}

/** Returns a JSON string (the manifest command param type) merging the envelope into existing keys. */
export function writeDraftEnvelope(
  existingMetadata: unknown,
  envelope: DraftEnvelope
): string {
  return JSON.stringify({
    ...normalizeMetadata(existingMetadata),
    [DRAFT_METADATA_KEY]: envelope,
  });
}
