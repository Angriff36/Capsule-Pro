Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const security_1 = require("@repo/security");
const env_1 = require("@/env");
const body_class_1 = require("./components/body-class");
const sidebar_1 = require("./components/sidebar");
const topbar_1 = require("./components/topbar");
const DevConsoleLayout = async ({ children }) => {
  if (env_1.env.ARCJET_KEY) {
    await (0, security_1.secure)(["CATEGORY:PREVIEW"]);
  }
  const user = await (0, server_1.currentUser)();
  const { redirectToSignIn } = await (0, server_1.auth)();
  if (!user) {
    return redirectToSignIn();
  }
  return (
    <div className="dev-console-root">
      <body_class_1.DevConsoleBodyClass />
      <sidebar_1.DevConsoleSidebar />
      <div className="dev-console-content">
        <topbar_1.DevConsoleTopbar />
        <main className="dev-console-main">{children}</main>
      </div>
    </div>
  );
};
exports.default = DevConsoleLayout;
