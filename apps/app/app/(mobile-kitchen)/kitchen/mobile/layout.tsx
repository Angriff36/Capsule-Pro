"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  ListChecks,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface MobileShellProperties {
  readonly children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/kitchen/mobile",
    label: "Today",
    icon: <Calendar aria-hidden="true" className="h-6 w-6" />,
  },
  {
    href: "/kitchen/mobile/tasks",
    label: "Tasks",
    icon: <ClipboardList aria-hidden="true" className="h-6 w-6" />,
  },
  {
    href: "/kitchen/mobile/prep-lists",
    label: "Prep Lists",
    icon: <ListChecks aria-hidden="true" className="h-6 w-6" />,
  },
  {
    href: "/kitchen/mobile/my-work",
    label: "My Work",
    icon: <Briefcase aria-hidden="true" className="h-6 w-6" />,
  },
];

export default function MobileShell({ children }: MobileShellProperties) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isActiveRoute = (href: string) => {
    if (!pathname) {
      return false;
    }
    if (href === "/kitchen/mobile") {
      return pathname === "/kitchen/mobile" || pathname === "/kitchen/mobile/";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2">
          <WifiOff aria-hidden="true" className="h-4 w-4 text-white" />
          <span className="font-medium text-white">
            You're offline. Actions will sync when you reconnect.
          </span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-auto pb-20">{children}</div>

      {/* Bottom navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-lg"
      >
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                className="flex h-full flex-1 flex-col items-center justify-center"
                href={item.href}
                key={item.href}
              >
                <Button
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-14 w-full flex-col items-center justify-center gap-1 rounded-none ${
                    isActive
                      ? "text-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  variant="ghost"
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
