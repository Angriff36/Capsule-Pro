import type { RuntimeEngine } from "@manifest/runtime";

export interface ManifestRuntimeContext {
  userId: string;
  tenantId: string;
  role?: string;
}

/**
 * Canonical runtime entrypoint for app-owned Manifest integration.
 * This is intentionally a thin scaffold while migration from legacy kitchen ops continues.
 */
export async function createRuntime(
  _context: ManifestRuntimeContext
): Promise<RuntimeEngine> {
  throw new Error(
    "createRuntime is not wired yet. Migrate callers from legacy @repo/manifest-adapters runtime paths into apps/api/lib/manifest/runtime.ts."
  );
}

