Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantClient = void 0;
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
]);
const ensureTenantWhere = (args, tenantId) => {
  const where = args.where ?? {};
  return { ...args, where: { ...where, tenantId } };
};
const ensureTenantData = (args, tenantId) => {
  const data = args.data ?? {};
  return { ...args, data: { ...data, tenantId } };
};
const ensureTenantDataMany = (args, tenantId) => {
  const data = Array.isArray(args.data) ? args.data : [];
  return {
    ...args,
    data: data.map((entry) => ({
      ...entry,
      tenantId,
    })),
  };
};
const assertNoFindUnique = (model, operation) => {
  if (operation === "findUnique" || operation === "findUniqueOrThrow") {
    throw new Error(
      `Use findFirst/findFirstOrThrow for ${model} with tenantId scoping.`
    );
  }
};
const createTenantClient = (tenantId, client) =>
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
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
exports.createTenantClient = createTenantClient;
