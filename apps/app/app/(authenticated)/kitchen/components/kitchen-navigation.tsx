"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  AlertTriangle,
  Calendar,
  ChefHat,
  ClipboardList,
  FileText,
  Package,
  Smartphone,
  Users,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    title: "Production Board",
    href: "/kitchen",
    icon: UtensilsCrossed,
  },
  {
    title: "Tasks",
    href: "/kitchen/tasks",
    icon: ClipboardList,
  },
  {
    title: "Recipes",
    href: "/kitchen/recipes",
    icon: ChefHat,
  },
  {
    title: "Prep Lists",
    href: "/kitchen/prep-lists",
    icon: FileText,
  },
  {
    title: "Inventory",
    href: "/kitchen/inventory",
    icon: Package,
  },
  {
    title: "Waste Tracking",
    href: "/kitchen/waste",
    icon: Warehouse,
  },
  {
    title: "Allergens",
    href: "/kitchen/allergens",
    icon: AlertTriangle,
  },
  {
    title: "Stations",
    href: "/kitchen/stations",
    icon: UtensilsCrossed,
  },
  {
    title: "Team",
    href: "/kitchen/team",
    icon: Users,
  },
  {
    title: "Schedule",
    href: "/kitchen/schedule",
    icon: Calendar,
  },
  {
    title: "Mobile",
    href: "/kitchen/mobile",
    icon: Smartphone,
  },
];

export function KitchenNavigation() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="border-slate-200 border-b bg-white/50 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 px-6 py-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

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
