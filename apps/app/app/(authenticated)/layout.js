Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const sidebar_1 = require("@repo/design-system/components/ui/sidebar");
const feature_flags_1 = require("@repo/feature-flags");
const security_1 = require("@repo/security");
const env_1 = require("@/env");
const notifications_provider_1 = require("./components/notifications-provider");
const sidebar_2 = require("./components/sidebar");
const AppLayout = async ({ children }) => {
  if (env_1.env.ARCJET_KEY) {
    await (0, security_1.secure)(["CATEGORY:PREVIEW"]);
  }
  const user = await (0, server_1.currentUser)();
  const { redirectToSignIn } = await (0, server_1.auth)();
  const betaFeature = await (0, feature_flags_1.showBetaFeature)();
  if (!user) {
    return redirectToSignIn();
  }
  return (
    <notifications_provider_1.NotificationsProvider userId={user.id}>
      <sidebar_1.SidebarProvider>
        <sidebar_2.GlobalSidebar>
          {betaFeature && (
            <div className="m-4 rounded-full bg-blue-500 p-1.5 text-center text-sm text-white">
              Beta feature now available
            </div>
          )}
          {children}
        </sidebar_2.GlobalSidebar>
      </sidebar_1.SidebarProvider>
    </notifications_provider_1.NotificationsProvider>
  );
};
exports.default = AppLayout;
