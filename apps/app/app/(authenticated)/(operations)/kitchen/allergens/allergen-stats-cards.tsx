/**
 * @module AllergenStatsCards
 * @intent Display key allergen management statistics in card format
 * @responsibility Render overview stats for allergen-tagged items, guest restrictions, and pending warnings
 * @domain Kitchen
 * @tags allergens, statistics, dashboard
 * @canonical true
 */

"use client";

import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  UsersIcon,
  UtensilsCrossedIcon,
} from "lucide-react";

interface AllergenStats {
  activeGuestRestrictions: number;
  dishesWithAllergens: number;
  pendingWarnings: number;
  recipesWithAllergens: number;
}

interface StatCard {
  bgColor: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
}

export function AllergenStatsCards({ stats }: { stats: AllergenStats }) {
  const cards: StatCard[] = [
    {
      title: "Recipes with Allergens",
      value: stats.recipesWithAllergens,
      icon: UtensilsCrossedIcon,
      color: "text-foreground",
      bgColor: "bg-muted/50",
    },
    {
      title: "Dishes with Warnings",
      value: stats.dishesWithAllergens,
      icon: AlertTriangleIcon,
      color: "text-foreground",
      bgColor: "bg-muted/50",
    },
    {
      title: "Active Guest Restrictions",
      value: stats.activeGuestRestrictions,
      icon: UsersIcon,
      color: "text-foreground",
      bgColor: "bg-muted/20",
    },
    {
      title: "Pending Warnings",
      value: stats.pendingWarnings,
      icon: CheckCircle2Icon,
      color: "text-foreground",
      bgColor: "bg-muted/50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} tone="soft-stone">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{card.title}</p>
                <p className="font-bold text-2xl">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
