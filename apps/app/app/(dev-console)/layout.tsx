import { auth, currentUser } from "@repo/auth/server";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { env } from "@/env";
import { DevConsoleBodyClass } from "./components/body-class";
import { DevConsoleSidebar } from "./components/sidebar";
import { DevConsoleTopbar } from "./components/topbar";

type DevConsoleLayoutProperties = {
  readonly children: ReactNode;
};

const DevConsoleLayout = async ({ children }: DevConsoleLayoutProperties) => {
  if (env.ARCJET_KEY) {
    await secure(["CATEGORY:PREVIEW"]);
  }

  const user = await currentUser();
  const { redirectToSignIn } = await auth();

  if (!user) {
    return redirectToSignIn();
  }

  return (
    <div className="dev-console-root">
      <DevConsoleBodyClass />
      <DevConsoleSidebar />
      <div className="dev-console-content">
        <DevConsoleTopbar />
        <main className="dev-console-main">{children}</main>
      </div>
    </div>
  );
};

export default DevConsoleLayout;
