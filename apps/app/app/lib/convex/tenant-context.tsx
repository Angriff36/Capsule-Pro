"use client";

import { createContext, useContext, type ReactNode } from "react";
import { setConvexTenantCache } from "./tenant-cache";

const TenantContext = createContext<string | null>(null);

export function TenantContextProvider({
  tenantId,
  children,
}: {
  tenantId: string;
  children: ReactNode;
}) {
  setConvexTenantCache(tenantId);
  return (
    <TenantContext.Provider value={tenantId}>{children}</TenantContext.Provider>
  );
}

export function useTenantId(): string {
  const tenantId = useContext(TenantContext);
  if (!tenantId) {
    throw new Error("useTenantId requires TenantContextProvider");
  }
  return tenantId;
}
