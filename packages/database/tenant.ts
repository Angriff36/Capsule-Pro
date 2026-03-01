import type { PrismaClient } from "./generated/client";

const tenantScopedModels = new Set([
  "Client",
  "ClientContact",
  "ClientInteraction",
  "ClientPreference",
  "KitchenTask",
  "KitchenTaskClaim",
  "KitchenTaskProgress",
  "Lead",
  "OutboxEvent",
  // Snake case models
  "kitchen_tasks",
  "task_claims",
  "task_progress",
  "event_reports",
]);

type PrismaArgs = Record<string, unknown>;

const ensureTenantWhere = (args: PrismaArgs, tenantId: string) => {
  const where = (args.where as Record<string, unknown> | undefined) ?? {};
  return { ...args, where: { ...where, tenantId } };
};

const ensureTenantData = (args: PrismaArgs, tenantId: string) => {
  const data = (args.data as Record<string, unknown> | undefined) ?? {};
  return { ...args, data: { ...data, tenantId } };
};

const ensureTenantDataMany = (args: PrismaArgs, tenantId: string) => {
  const data = Array.isArray(args.data) ? args.data : [];
  return {
    ...args,
    data: data.map((entry) => ({
      ...entry,
      tenantId,
    })),
  };
};

const assertNoFindUnique = (model: string, operation: string) => {
  if (operation === "findUnique" || operation === "findUniqueOrThrow") {
    throw new Error(
      `Use findFirst/findFirstOrThrow for ${model} with tenantId scoping.`
    );
  }
};

export const createTenantClient = (tenantId: string, client: PrismaClient) =>
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string | undefined;
          operation: string;
          args: PrismaArgs;
          query: (args: PrismaArgs) => Promise<unknown>;
        }) {
          if (!(model && tenantScopedModels.has(model))) {
            return query(args);
          }

          assertNoFindUnique(model, operation);

          switch (operation) {
            case "create":
              return query(ensureTenantData(args, tenantId));
            case "createMany":
              return query(ensureTenantDataMany(args, tenantId));
            case "update":
            case "updateMany":
            case "delete":
            case "deleteMany":
            case "upsert":
            case "findFirst":
            case "findFirstOrThrow":
            case "findMany":
            case "count":
            case "aggregate":
            case "groupBy":
              return query(ensureTenantWhere(args, tenantId));
            default:
              return query(args);
          }
        },
      },
    },
  });
