"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.WasteStatsCards = WasteStatsCards;
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
function WasteStatsCards() {
  const [stats, setStats] = (0, react_1.useState)(null);
  const [loading, setLoading] = (0, react_1.useState)(true);
  (0, react_1.useEffect)(() => {
    async function fetchStats() {
      try {
        const trendsResponse = await fetch(
          "/api/kitchen/waste/trends?period=30d"
        );
        const trends = await trendsResponse.json();
        setStats(trends.trends.summary);
      } catch (error) {
        console.error("Failed to fetch waste stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);
  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <card_1.Card key={i}>
            <card_1.CardContent className="p-6">
              <div className="h-4 w-24 animate-pulse bg-muted rounded mb-2" />
              <div className="h-8 w-32 animate-pulse bg-muted rounded" />
            </card_1.CardContent>
          </card_1.Card>
        ))}
      </div>
    );
  }
  const cards = [
    {
      title: "Total Waste Cost",
      value: `$${stats.totalCost.toFixed(2)}`,
      icon: lucide_react_1.DollarSign,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Waste Entries",
      value: stats.totalEntries.toString(),
      icon: lucide_react_1.Trash2,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Quantity",
      value: stats.totalQuantity.toFixed(1),
      icon: lucide_react_1.Scale,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Avg Cost/Entry",
      value: `$${stats.avgCostPerEntry.toFixed(2)}`,
      icon: lucide_react_1.TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <card_1.Card key={card.title}>
          <card_1.CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      ))}
    </div>
  );
}
