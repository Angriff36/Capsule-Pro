/**
 * App-owned store adapter seam for Manifest runtime storage.
 * Implement Prisma-backed Store wiring here as migration off legacy kitchen ops completes.
 */
export interface PrismaManifestStoreOptions {
  tenantId: string;
  entityName: string;
}

export function createPrismaManifestStore(
  _options: PrismaManifestStoreOptions
): never {
  throw new Error(
    "createPrismaManifestStore is not implemented yet. Use this module as the canonical adapter target."
  );
}
