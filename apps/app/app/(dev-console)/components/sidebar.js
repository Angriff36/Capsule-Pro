"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevConsoleSidebar = void 0;
const utils_1 = require("@repo/design-system/lib/utils");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const navSections = [
  {
    label: "Platform",
    items: [
      {
        title: "Dashboard",
        href: "/dev-console",
        icon: lucide_react_1.LayoutDashboardIcon,
      },
      {
        title: "Tenants",
        href: "/dev-console/tenants",
        icon: lucide_react_1.BoxesIcon,
      },
      {
        title: "Users",
        href: "/dev-console/users",
        icon: lucide_react_1.UsersIcon,
      },
    ],
  },
  {
    label: "Developers",
    items: [
      {
        title: "API Keys",
        href: "/dev-console/api-keys",
        icon: lucide_react_1.KeyIcon,
      },
      {
        title: "Webhooks",
        href: "/dev-console/webhooks",
        icon: lucide_react_1.WebhookIcon,
      },
      {
        title: "Audit Logs",
        href: "/dev-console/audit-logs",
        icon: lucide_react_1.ShieldCheckIcon,
      },
    ],
  },
];
const DevConsoleSidebar = () => {
  const pathname = (0, navigation_1.usePathname)();
  return (
    <aside className="dev-console-sidebar">
      <div className="dev-console-brand">
        <div className="dev-console-logo" />
        <div className="dev-console-brand-text">DevConsole</div>
      </div>
      <nav className="dev-console-nav">
        {navSections.map((section) => (
          <div className="dev-console-nav-section" key={section.label}>
            <div className="dev-console-nav-label">{section.label}</div>
            <div className="dev-console-nav-items">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dev-console" &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <link_1.default
                    className={(0, utils_1.cn)(
                      "dev-console-nav-item",
                      isActive && "dev-console-nav-item-active"
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </link_1.default>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="dev-console-profile">
        <div className="dev-console-avatar" />
        <div>
          <div className="dev-console-profile-name">Alex Dev</div>
          <div className="dev-console-profile-role">Super Admin</div>
        </div>
      </div>
    </aside>
  );
};
exports.DevConsoleSidebar = DevConsoleSidebar;
