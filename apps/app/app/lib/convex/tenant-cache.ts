let cachedTenantId: string | null = null;

export function setConvexTenantCache(tenantId: string) {
  cachedTenantId = tenantId;
}

export function getConvexTenantCache(): string | null {
  return cachedTenantId;
}
