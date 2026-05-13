import { auth, currentUser } from "@repo/auth/server";
import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { showBetaFeature } from "@repo/feature-flags";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { AblyProvider } from "@/app/ably-provider";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { env } from "@/env";
import {
  AiAssistantButton,
  AiAssistantPanel,
  AiAssistantProvider,
} from "./components/ai-assistant";
import { GlobalSidebar } from "./components/sidebar";

interface AppLayoutProperties {
  readonly children: ReactNode;
}

/**
 * NotificationsProvider has been moved from this layout to inside GlobalSidebar.
 *
 * Per Next.js guidance: "Render providers as deep as possible"
 * https://nextjs.org/docs/app/getting-started/server-and-client-components#rendering-providers-deep-in-the-tree
 *
 * The Knock notification SDK (@knocklabs/react) is now only loaded when the user
 * actually clicks on the notifications bell icon, not on every page load.
 */
const AppLayout = async ({ children }: AppLayoutProperties) => {
  if (env.ARCJET_KEY) {
    await secure(["CATEGORY:PREVIEW"]);
  }

  const { orgId, userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const user = await currentUser();
  const betaFeature = await showBetaFeature();
  const tenantId = orgId ? await getTenantIdForOrg(orgId) : null;

  if (!user) {
    return redirectToSignIn();
  }

  return (
    <SidebarProvider>
      <AblyProvider tenantId={tenantId}>
        <AiAssistantProvider>
          <GlobalSidebar userId={user.id}>
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
      </AblyProvider>
    </SidebarProvider>
  );
};

export default AppLayout;
