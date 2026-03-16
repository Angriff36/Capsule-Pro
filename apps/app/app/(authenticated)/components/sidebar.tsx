"use client";

import { useState } from "react";
import { OrganizationSwitcher, UserButton } from "@repo/auth/client";
import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { cn } from "@repo/design-system/lib/utils";
import { AnchorIcon, BellIcon, CogIcon, LifeBuoyIcon, SendIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ModuleHeader } from "./module-header";
import { getModuleKeyFromPathname, modules } from "./module-nav";
import { Search } from "./search";

/**
 * Lazy-load NotificationsTrigger with placeholder.
 * Per Next.js docs: use next/dynamic with ssr: false for client-only heavy imports
 * https://nextjs.org/docs/app/guides/lazy-loading
 */
const NotificationsTrigger = dynamic(
  () =>
    import("@repo/notifications/components/trigger").then(
      (mod) => mod.NotificationsTrigger
    ),
  {
    ssr: false,
    loading: () => <BellIcon className="h-4 w-4" />,
  }
);

/**
 * Lazy-load NotificationsProvider.
 * Per Next.js docs: use next/dynamic with ssr: false
 * The provider is only rendered when showNotifications is true (after user click).
 */
const NotificationsProvider = dynamic(
  () =>
    import("@repo/notifications/components/provider").then(
      (mod) => mod.NotificationsProvider
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

interface GlobalSidebarProperties {
  readonly children: ReactNode;
  readonly userId: string;
}

const data = {
  navSecondary: [
    {
      title: "Webhooks",
      url: "/webhooks",
      icon: AnchorIcon,
    },
    {
      title: "Support",
      url: "mailto:support@capsulepro.com",
      icon: LifeBuoyIcon,
    },
    {
      title: "Feedback",
      url: "mailto:feedback@capsulepro.com",
      icon: SendIcon,
    },
  ],
};

export const GlobalSidebar = ({ children, userId }: GlobalSidebarProperties) => {
  const sidebar = useSidebar();
  const pathname = usePathname() ?? "";
  const [showNotifications, setShowNotifications] = useState(false);
  const activeModuleKey = getModuleKeyFromPathname(pathname);
  const activeModule =
    modules.find((module) => module.key === activeModuleKey) ?? modules[0];

  /**
   * Handle notification bell click - ONLY load Knock SDK AFTER user interaction.
   * 
   * Per Next.js lazy-loading guidance:
   * "Use dynamic imports for components that are not needed for the initial render.
   *  Lazy-loaded components are only loaded when they are rendered."
   * https://nextjs.org/docs/app/guides/lazy-loading
   * 
   * This ensures @knocklabs/react is NOT requested on first page load.
   * The chunk is only requested when showNotifications becomes true.
   */
  const handleNotificationClick = () => {
    setShowNotifications(true);
  };

  return (
    <>
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div
                className={cn(
                  "h-[36px] overflow-hidden transition-all [&>div]:w-full",
                  sidebar.open ? "" : "-mx-1"
                )}
              >
                <OrganizationSwitcher
                  afterSelectOrganizationUrl="/"
                  hidePersonal
                />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <Search />
        <SidebarContent>
          {activeModule.sidebar.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive =
                    item.href &&
                    (pathname === item.href ||
                      pathname.startsWith(`${item.href}/`));

                  if (!item.href) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          className="cursor-default opacity-60"
                          disabled
                        >
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={Boolean(isActive)}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Settings">
                    <Link href={`/${activeModuleKey}/settings`}>
                      <CogIcon />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {data.navSecondary.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem
              className="flex items-center gap-2"
              suppressHydrationWarning
            >
              <UserButton
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
                <ModeToggle />
                {showNotifications ? (
                  /**
                   * After user click: render lazy-loaded provider + trigger.
                   * 
                   * Both are dynamically imported with ssr: false.
                   * The Knock SDK chunk is requested HERE, not on initial page load.
                   * 
                   * Per Next.js: "Components rendered inside the app are 
                   * client components and are only rendered on the client."
                   */
                  <NotificationsProvider userId={userId}>
                    <NotificationsTrigger />
                  </NotificationsProvider>
                ) : (
                  /**
                   * Initial render: lightweight bell icon only.
                   * NO @knocklabs/react loaded yet.
                   * 
                   * User must click to trigger the lazy load.
                   */
                  <Button
                    asChild
                    className="shrink-0"
                    size="icon"
                    variant="ghost"
                    onClick={handleNotificationClick}
                    aria-label="Open notifications"
                  >
                    <div className="h-4 w-4">
                      <BellIcon className="h-4 w-4" />
                    </div>
                  </Button>
                )}
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <ModuleHeader />
        {children}
      </SidebarInset>
    </>
  );
};
