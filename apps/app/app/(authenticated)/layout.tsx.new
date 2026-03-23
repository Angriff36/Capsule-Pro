import { auth, currentUser } from "@repo/auth/server";
import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { showBetaFeature } from "@repo/feature-flags";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { env } from "@/env";
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

  const user = await currentUser();
  const { redirectToSignIn } = await auth();
  const betaFeature = await showBetaFeature();

  if (!user) {
    return redirectToSignIn();
  }

  return (
    <SidebarProvider>
      <GlobalSidebar userId={user.id}>
        {betaFeature && (
          <div className="m-4 rounded-full bg-blue-500 p-1.5 text-center text-sm text-white">
            Beta feature now available
          </div>
        )}
        {children}
      </GlobalSidebar>
    </SidebarProvider>
  );
};

export default AppLayout;
