"use client";

import { cn } from "@repo/design-system/lib/utils";
import {
  BoxesIcon,
  KeyIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    label: "Platform",
    items: [
      { title: "Dashboard", href: "/dev-console", icon: LayoutDashboardIcon },
      { title: "Tenants", href: "/dev-console/tenants", icon: BoxesIcon },
      { title: "Users", href: "/dev-console/users", icon: UsersIcon },
    ],
  },
  {
    label: "Developers",
    items: [
      { title: "API Keys", href: "/dev-console/api-keys", icon: KeyIcon },
      { title: "Webhooks", href: "/dev-console/webhooks", icon: WebhookIcon },
      {
        title: "Audit Logs",
        href: "/dev-console/audit-logs",
        icon: ShieldCheckIcon,
      },
    ],
  },
];

export const DevConsoleSidebar = () => {
  const pathname = usePathname() ?? "";

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
                  <Link
                    className={cn(
                      "dev-console-nav-item",
                      isActive && "dev-console-nav-item-active"
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
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
