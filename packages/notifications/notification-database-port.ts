/**
 * Structural persistence port for notification services.
 * Callers inject Convex/manifest-backed implementations — no Prisma dependency.
 */

type ModelDelegate = {
  create?: (args: unknown) => Promise<unknown>;
  findFirst?: (args: unknown) => Promise<unknown | null>;
  findMany?: (args: unknown) => Promise<unknown[]>;
  update?: (args: unknown) => Promise<unknown>;
  upsert?: (args: unknown) => Promise<unknown>;
};

export type NotificationDatabase = {
  emailLog: Required<
    Pick<ModelDelegate, "create" | "update" | "findFirst" | "findMany">
  >;
  emailTemplate: Required<Pick<ModelDelegate, "findFirst">>;
  emailWorkflow: Required<Pick<ModelDelegate, "findMany">>;
  notification_preferences: Required<
    Pick<ModelDelegate, "findFirst" | "findMany" | "upsert">
  >;
  sms_automation_rules: Required<Pick<ModelDelegate, "findMany">>;
  sms_logs: Required<
    Pick<ModelDelegate, "create" | "update" | "findFirst" | "findMany">
  >;
  user: Required<Pick<ModelDelegate, "findFirst" | "findMany">>;
};
