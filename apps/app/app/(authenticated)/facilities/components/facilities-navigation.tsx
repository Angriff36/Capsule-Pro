"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Calendar, MapPin, Wrench, Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    title: "Work Orders",
    href: "/facilities",
    icon: Wrench,
  },
  {
    title: "PM Schedules",
    href: "/facilities/schedules",
    icon: Calendar,
  },
  {
    title: "Areas",
    href: "/facilities/areas",
    icon: MapPin,
  },
  {
    title: "Assets",
    href: "/facilities/assets",
    icon: Package,
  },
];

export function FacilitiesNavigation() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="border-slate-200 border-b bg-white/50 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 px-6 py-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/facilities"
              ? pathname === "/facilities"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Button
              asChild
              className="h-9 gap-2"
              key={item.href}
              size="sm"
              variant={isActive ? "default" : "ghost"}
            >
              <Link href={item.href}>
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
