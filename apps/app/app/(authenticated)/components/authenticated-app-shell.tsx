"use client";

import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import type { ReactNode } from "react";
import {
  AiAssistantButton,
  AiAssistantPanel,
  AiAssistantProvider,
} from "./ai-assistant";
import { GlobalSidebar } from "./sidebar";

type AuthenticatedAppShellProps = {
  readonly userId: string;
  readonly betaFeature: boolean;
  readonly children: ReactNode;
};

/**
 * Single client boundary for the authenticated layout.
 * Keeps the server layout free of direct workspace UI imports (Turbopack HMR).
 */
export function AuthenticatedAppShell({
  userId,
  betaFeature,
  children,
}: AuthenticatedAppShellProps) {
  return (
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
  );
}
