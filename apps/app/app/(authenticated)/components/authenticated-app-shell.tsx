"use client";

import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import type { ReactNode } from "react";
import {
  AiAssistantButton,
  AiAssistantPanel,
  AiAssistantProvider,
} from "./ai-assistant";
import { DisplayPreferencesAccountSync } from "./display-preferences-account-sync";
import { HighContrastAccountSync } from "./high-contrast-account-sync";
import { GlobalSidebar } from "./sidebar";
import { SmartImportFab } from "./smart-import/smart-import-fab";
import { SmartImportProvider } from "./smart-import/smart-import-provider";

interface AuthenticatedAppShellProps {
  readonly betaFeature: boolean;
  readonly children: ReactNode;
  readonly userId: string;
}

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
      <a
        className="sr-only z-50 rounded-md bg-background px-4 py-2 font-medium text-foreground shadow-md focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        href="#main-content"
      >
        Skip to main content
      </a>
      <AiAssistantProvider>
        <HighContrastAccountSync />
        <DisplayPreferencesAccountSync />
        <SmartImportProvider>
          <GlobalSidebar userId={userId}>
            {betaFeature && (
              <div className="m-4 rounded-full bg-blue-500 p-1.5 text-center text-sm text-white">
                Beta feature now available
              </div>
            )}
            {children}
          </GlobalSidebar>
          <SmartImportFab />
          <AiAssistantButton />
          <AiAssistantPanel />
        </SmartImportProvider>
      </AiAssistantProvider>
    </SidebarProvider>
  );
}
