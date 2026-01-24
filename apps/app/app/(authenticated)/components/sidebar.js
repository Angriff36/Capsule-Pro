"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalSidebar = void 0;
const client_1 = require("@repo/auth/client");
const mode_toggle_1 = require("@repo/design-system/components/mode-toggle");
const button_1 = require("@repo/design-system/components/ui/button");
const sidebar_1 = require("@repo/design-system/components/ui/sidebar");
const utils_1 = require("@repo/design-system/lib/utils");
const trigger_1 = require("@repo/notifications/components/trigger");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const module_header_1 = require("./module-header");
const module_nav_1 = require("./module-nav");
const search_1 = require("./search");
const data = {
  navSecondary: [
    {
      title: "Webhooks",
      url: "/webhooks",
      icon: lucide_react_1.AnchorIcon,
    },
    {
      title: "Support",
      url: "#",
      icon: lucide_react_1.LifeBuoyIcon,
    },
    {
      title: "Feedback",
      url: "#",
      icon: lucide_react_1.SendIcon,
    },
  ],
};
const GlobalSidebar = ({ children }) => {
  const sidebar = (0, sidebar_1.useSidebar)();
  const pathname = (0, navigation_1.usePathname)();
  const activeModuleKey = (0, module_nav_1.getModuleKeyFromPathname)(pathname);
  const activeModule =
    module_nav_1.modules.find((module) => module.key === activeModuleKey) ??
    module_nav_1.modules[0];
  return (
    <>
      <sidebar_1.Sidebar variant="inset">
        <sidebar_1.SidebarHeader>
          <sidebar_1.SidebarMenu>
            <sidebar_1.SidebarMenuItem>
              <div
                className={(0, utils_1.cn)(
                  "h-[36px] overflow-hidden transition-all [&>div]:w-full",
                  sidebar.open ? "" : "-mx-1"
                )}
              >
                <client_1.OrganizationSwitcher
                  afterSelectOrganizationUrl="/"
                  hidePersonal
                />
              </div>
            </sidebar_1.SidebarMenuItem>
          </sidebar_1.SidebarMenu>
        </sidebar_1.SidebarHeader>
        <search_1.Search />
        <sidebar_1.SidebarContent>
          {activeModule.sidebar.map((section) => (
            <sidebar_1.SidebarGroup key={section.label}>
              <sidebar_1.SidebarGroupLabel>
                {section.label}
              </sidebar_1.SidebarGroupLabel>
              <sidebar_1.SidebarMenu>
                {section.items.map((item) => {
                  const isActive =
                    item.href &&
                    (pathname === item.href ||
                      pathname.startsWith(`${item.href}/`));
                  if (!item.href) {
                    return (
                      <sidebar_1.SidebarMenuItem key={item.title}>
                        <sidebar_1.SidebarMenuButton
                          className="cursor-default opacity-60"
                          disabled
                        >
                          <span>{item.title}</span>
                        </sidebar_1.SidebarMenuButton>
                      </sidebar_1.SidebarMenuItem>
                    );
                  }
                  return (
                    <sidebar_1.SidebarMenuItem key={item.title}>
                      <sidebar_1.SidebarMenuButton
                        asChild
                        isActive={Boolean(isActive)}
                        tooltip={item.title}
                      >
                        <link_1.default href={item.href}>
                          <span>{item.title}</span>
                        </link_1.default>
                      </sidebar_1.SidebarMenuButton>
                    </sidebar_1.SidebarMenuItem>
                  );
                })}
              </sidebar_1.SidebarMenu>
            </sidebar_1.SidebarGroup>
          ))}
          <sidebar_1.SidebarGroup className="mt-auto">
            <sidebar_1.SidebarGroupContent>
              <sidebar_1.SidebarMenu>
                <sidebar_1.SidebarMenuItem>
                  <sidebar_1.SidebarMenuButton asChild tooltip="Settings">
                    <link_1.default href={`/${activeModuleKey}/settings`}>
                      <lucide_react_1.CogIcon />
                      <span>Settings</span>
                    </link_1.default>
                  </sidebar_1.SidebarMenuButton>
                </sidebar_1.SidebarMenuItem>
                {data.navSecondary.map((item) => (
                  <sidebar_1.SidebarMenuItem key={item.title}>
                    <sidebar_1.SidebarMenuButton asChild>
                      <link_1.default href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </link_1.default>
                    </sidebar_1.SidebarMenuButton>
                  </sidebar_1.SidebarMenuItem>
                ))}
              </sidebar_1.SidebarMenu>
            </sidebar_1.SidebarGroupContent>
          </sidebar_1.SidebarGroup>
        </sidebar_1.SidebarContent>
        <sidebar_1.SidebarFooter>
          <sidebar_1.SidebarMenu>
            <sidebar_1.SidebarMenuItem
              className="flex items-center gap-2"
              suppressHydrationWarning
            >
              <client_1.UserButton
                appearance={{
                  elements: {
                    rootBox: "flex overflow-hidden w-full",
                    userButtonBox: "flex-row-reverse",
                    userButtonOuterIdentifier: "truncate pl-0",
                  },
                }}
                showName
              />
              <div className="flex shrink-0 items-center gap-px">
                <mode_toggle_1.ModeToggle />
                <button_1.Button
                  asChild
                  className="shrink-0"
                  size="icon"
                  variant="ghost"
                >
                  <div className="h-4 w-4">
                    <trigger_1.NotificationsTrigger />
                  </div>
                </button_1.Button>
              </div>
            </sidebar_1.SidebarMenuItem>
          </sidebar_1.SidebarMenu>
        </sidebar_1.SidebarFooter>
      </sidebar_1.Sidebar>
      <sidebar_1.SidebarInset>
        <module_header_1.ModuleHeader />
        {children}
      </sidebar_1.SidebarInset>
    </>
  );
};
exports.GlobalSidebar = GlobalSidebar;
