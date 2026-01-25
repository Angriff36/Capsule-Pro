"use client";

import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { DollarSign, Scale, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchWasteTrends, type WasteTrendsData } from "./lib/waste-analytics";

type WasteStats = WasteTrendsData["summary"];

export function WasteStatsCards() {
  const [stats, setStats] = useState<WasteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const trends = await fetchWasteTrends();
        setStats(trends.summary);
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
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 w-24 animate-pulse bg-muted rounded mb-2" />
              <div className="h-8 w-32 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Waste Cost",
      value: `$${stats.totalCost.toFixed(2)}`,
      icon: DollarSign,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Waste Entries",
      value: stats.totalEntries.toString(),
      icon: Trash2,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Quantity",
      value: stats.totalQuantity.toFixed(1),
      icon: Scale,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Avg Cost/Entry",
      value: `$${stats.avgCostPerEntry.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
