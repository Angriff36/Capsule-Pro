/**
 * @module AllergenStatsCards
 * @intent Display key allergen management statistics in card format
 * @responsibility Render overview stats for allergen-tagged items, guest restrictions, and pending warnings
 * @domain Kitchen
 * @tags allergens, statistics, dashboard
 * @canonical true
 */
"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AllergenStatsCards = AllergenStatsCards;
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
function AllergenStatsCards({ stats }) {
  const cards = [
    {
      title: "Recipes with Allergens",
      value: stats.recipesWithAllergens,
      icon: lucide_react_1.UtensilsCrossedIcon,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "Dishes with Warnings",
      value: stats.dishesWithAllergens,
      icon: lucide_react_1.AlertTriangleIcon,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      title: "Active Guest Restrictions",
      value: stats.activeGuestRestrictions,
      icon: lucide_react_1.UsersIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Pending Warnings",
      value: stats.pendingWarnings,
      icon: lucide_react_1.CheckCircle2Icon,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <card_1.Card className="shadow-sm" key={card.title}>
          <card_1.CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      ))}
    </div>
  );
}
