import { auth, currentUser } from "@repo/auth/server";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { env } from "@/env";
import { NotificationsProvider } from "../(authenticated)/components/notifications-provider";

interface MobileKitchenLayoutProperties {
  readonly children: ReactNode;
}

/**
 * Layout for mobile kitchen routes.
 * Provides authentication without the desktop sidebar.
 */
const MobileKitchenLayout = async ({
  children,
}: MobileKitchenLayoutProperties) => {
  if (env.ARCJET_KEY) {
    await secure(["CATEGORY:PREVIEW"]);
  }

  const user = await currentUser();
  const { redirectToSignIn } = await auth();

  if (!user) {
    return redirectToSignIn();
  }

  return (
    <NotificationsProvider userId={user.id}>
      <div className="flex h-screen flex-col">{children}</div>
    </NotificationsProvider>
  );
};

export default MobileKitchenLayout;
