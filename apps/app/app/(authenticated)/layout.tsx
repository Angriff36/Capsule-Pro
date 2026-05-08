import { auth, currentUser } from "@repo/auth/server";
import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { showBetaFeature } from "@repo/feature-flags";
import { secure } from "@repo/security";
import { unstable_cache } from "next/cache";
import type { ReactNode } from "react";
import { env } from "@/env";
import {
  AiAssistantButton,
  AiAssistantPanel,
  AiAssistantProvider,
} from "./components/ai-assistant";
import { GlobalSidebar } from "./components/sidebar";

/**
 * Cache currentUser() + showBetaFeature() per user for 5 minutes.
 * auth() stays uncached — session validation must happen on every request.
 *
 * Per-user cache tag enables instant invalidation on permission change:
 *   revalidateTag("app-auth")    → invalidate ALL cached auth
 *   (Next.js 15 stable API)
 */
const getCachedAuth = unstable_cache(
  async (userId: string) => {
    const [user, betaFeature] = await Promise.all([
      currentUser(),
      showBetaFeature(),
    ]);
    return { user, betaFeature };
  },
  ["app-auth"],
  { revalidate: 300, tags: ["app-auth"] },
);

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

  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const { user, betaFeature } = await getCachedAuth(userId);

  if (!user) {
    return redirectToSignIn();
  }

  return (
    <SidebarProvider>
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
    </SidebarProvider>
  );
};

export default AppLayout;
