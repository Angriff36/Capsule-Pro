"use client";

import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import type { ReactNode } from "react";
import { TenantContextProvider } from "@/app/lib/convex/tenant-context";
import {
  AiAssistantButton,
  AiAssistantPanel,
  AiAssistantProvider,
} from "./ai-assistant";
import { GlobalSidebar } from "./sidebar";

type AuthenticatedAppShellProps = {
  readonly userId: string;
  readonly tenantId: string;
  readonly betaFeature: boolean;
  readonly children: ReactNode;
};

export function AuthenticatedAppShell({
  userId,
  tenantId,
  betaFeature,
  children,
}: AuthenticatedAppShellProps) {
  return (
    <TenantContextProvider tenantId={tenantId}>
      <SidebarProvider>
        <AiAssistantProvider>
          <GlobalSidebar userId={userId}>
            {betaFeature && (
              <div className="m-4 rounded-full bg-blue-500 p-1.5 text-center text-sm text-white">
                Beta feature now available
              </div>
            )}
            {children}
          </GlobalSidebar>
          <AiAssistantButton />
          <AiAssistantPanel />
        </AiAssistantProvider>
      </SidebarProvider>
    </TenantContextProvider>
  );
}
