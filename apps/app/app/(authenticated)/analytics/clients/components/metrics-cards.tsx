"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import type { ClientLTVMetrics } from "../actions/get-client-ltv";

interface MetricsCardsProps {
  metrics: ClientLTVMetrics;
  className?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export function MetricsCards({ metrics, className }: MetricsCardsProps) {
  const cards = [
    {
      title: "Total Clients",
      value: metrics.totalClients.toLocaleString(),
      description: "Active clients in the system",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      description: "Lifetime revenue from all clients",
    },
    {
      title: "Average Order Value",
      value: formatCurrency(metrics.averageOrderValue),
      description: "Mean order amount",
    },
    {
      title: "Average LTV",
      value: formatCurrency(metrics.averageLTV),
      description: "Mean lifetime value per client",
    },
    {
      title: "Median LTV",
      value: formatCurrency(metrics.medianLTV),
      description: "Middle value of client LTV",
    },
    {
      title: "Retention Rate",
      value: formatPercent(metrics.retentionRate),
      description: "Clients with repeat orders (1 year)",
    },
  ];

  return (
    <div
      className={cn(
        "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        className
      )}
    >
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardDescription>{card.description}</CardDescription>
            <CardTitle className="text-2xl">{card.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
