// Generated from manifest.config.yaml — DO NOT EDIT
// Produced by manifest/scripts/generate-prisma-model-metadata.mjs
// Re-run via `pnpm manifest:build` after bridge map changes.
/* eslint-disable */

export const ENTITY_TO_PRISMA_MODEL: Readonly<Record<string, string>> = {
  "EventImportWorkflow": "EventImport",
  "LogisticsRoute": "DeliveryRoute",
  "EventTimelineItem": "EventTimeline",
  "QACorrectiveAction": "CorrectiveAction",
  "QATemperatureLog": "TemperatureLog"
};

/** Resolve Manifest IR entity name to Prisma model metadata key. */
export function resolvePrismaModelKey(entityName: string): string {
  return ENTITY_TO_PRISMA_MODEL[entityName] ?? entityName;
}
