import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { createManifestRuntime } from "@/lib/manifest-runtime";

interface ManifestUser {
  id: string;
  tenantId: string;
  role: string;
}

export async function runKitchenImportCommand(
  user: ManifestUser,
  entity: string,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    {
      createRuntime: ({ user: runtimeUser, entityName }) =>
        createManifestRuntime({
          user: {
            id: runtimeUser.id,
            tenantId: runtimeUser.tenantId,
            role: runtimeUser.role,
          },
          entityName,
        }),
    },
    {
      entity,
      command,
      user,
      body,
    }
  );
}
