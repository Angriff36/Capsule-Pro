import type { PrismaClient } from "./generated/client";
export declare const createTenantClient: (
  tenantId: string,
  client: PrismaClient
) => import("@prisma/client/runtime/client").DynamicClientExtensionThis<
  import("./generated/internal/prismaNamespace").TypeMap<
    import("@prisma/client/runtime/client").InternalArgs & {
      result: {};
      model: {};
      query: {};
      client: {};
    },
    import("./generated/internal/prismaNamespace").GlobalOmitConfig | undefined
  >,
  import("./generated/internal/prismaNamespace").TypeMapCb<
    import("./generated/internal/prismaNamespace").GlobalOmitConfig | undefined
  >,
  {
    result: {};
    model: {};
    query: {};
    client: {};
  }
>;
//# sourceMappingURL=tenant.d.ts.map
