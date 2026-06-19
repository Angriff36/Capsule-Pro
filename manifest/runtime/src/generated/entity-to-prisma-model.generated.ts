// Generated from manifest.config.yaml — DO NOT EDIT
// Produced by manifest/scripts/generate-prisma-model-metadata.mjs
// Re-run via `pnpm manifest:generate-metadata` after bridge map changes.
/* eslint-disable */

export const ENTITY_TO_PRISMA_MODEL: Readonly<Record<string, string>> = {
  "EventImportWorkflow": "EventImport",
  "BankAccount": "EmployeeBankAccount",
  "LogisticsRoute": "DeliveryRoute",
  "Document": "documents",
  "SmsAutomationRule": "sms_automation_rules",
  "EventTimelineItem": "EventTimeline",
  "StorageLocation": "storage_locations",
  "BulkCombineRule": "bulk_combine_rules",
  "MethodVideo": "method_videos",
  "PrepListImport": "prep_list_imports",
  "QACorrectiveAction": "CorrectiveAction",
  "QATemperatureLog": "TemperatureLog",
  "TaskBundleItem": "task_bundle_items",
  "TaskBundle": "task_bundles",
  "OpenShift": "open_shifts"
};

/** Resolve Manifest IR entity name to Prisma model metadata key. */
export function resolvePrismaModelKey(entityName: string): string {
  return ENTITY_TO_PRISMA_MODEL[entityName] ?? entityName;
}
