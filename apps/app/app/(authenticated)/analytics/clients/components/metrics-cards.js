"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCards = MetricsCards;
const card_1 = require("@repo/design-system/components/ui/card");
const utils_1 = require("@repo/design-system/lib/utils");
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
const formatPercent = (value) => `${value.toFixed(1)}%`;
function MetricsCards({ metrics, className }) {
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
      className={(0, utils_1.cn)(
        "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        className
      )}
    >
      {cards.map((card) => (
        <card_1.Card key={card.title}>
          <card_1.CardHeader className="pb-2">
            <card_1.CardDescription>{card.description}</card_1.CardDescription>
            <card_1.CardTitle className="text-2xl">
              {card.value}
            </card_1.CardTitle>
          </card_1.CardHeader>
        </card_1.Card>
      ))}
    </div>
  );
}
