import "server-only";
import { PrismaClient } from "./generated/client";
export declare const database: PrismaClient;
export declare const tenantDatabase: (
  tenantId: string
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
export * from "./generated/client";
export { Prisma } from "./generated/client";
export * from "./src/critical-path";
export * from "./tenant";
//# sourceMappingURL=index.d.ts.map
