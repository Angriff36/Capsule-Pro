import { auth, currentUser } from "@repo/auth/server";
import { showBetaFeature } from "@repo/feature-flags";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { env } from "@/env";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { PickOrganizationScreen } from "./components/pick-organization-screen";
import { AuthenticatedAppShell } from "./components/authenticated-app-shell";

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
 *
 * Realtime subscriptions are now established per-feature via the SSE-based
 * `useRealtimeChannel` hook (apps/app/app/lib/use-realtime-channel.ts).
 * No app-wide realtime provider is required.
 */
const AppLayout = async ({ children }: AppLayoutProperties) => {
  if (env.ARCJET_KEY) {
    await secure(["CATEGORY:PREVIEW"]);
  }

  const { userId, orgId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const user = await currentUser();

  if (!user) {
    return redirectToSignIn();
  }

  if (!orgId) {
    return <PickOrganizationScreen />;
  }

  const betaFeature = await showBetaFeature();
  const tenantId = await getTenantIdForOrg(orgId);

  return (
    <AuthenticatedAppShell betaFeature={betaFeature} tenantId={tenantId} userId={user.id}>
      {children}
    </AuthenticatedAppShell>
  );
};

export default AppLayout;
