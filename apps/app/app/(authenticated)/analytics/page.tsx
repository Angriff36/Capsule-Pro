import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Separator } from "@repo/design-system/components/ui/separator";

const performanceCards = [
  {
    title: "Weekly revenue",
    value: "$142,000",
    detail: "+8% vs. last week",
    trend: "up" as const,
  },
  {
    title: "Labor efficiency",
    value: "92%",
    detail: "2% rebound after labor reforecast",
    trend: "up" as const,
  },
  {
    title: "Waste reduction",
    value: "-12%",
    detail: "Down vs. historical baseline",
    trend: "down" as const,
  },
];

const focusMetrics = [
  {
    title: "Profit margin",
    value: "21.4%",
    description: "Events with real-time budgets aligned",
  },
  {
    title: "Service completion",
    value: "98%",
    description: "Events on track this week",
  },
  {
    title: "Client satisfaction",
    value: "4.8/5",
    description: "Surveyed after delivery",
  },
];

const topEvents = [
  {
    name: "Acme Gala",
    revenue: "$68,400",
    margin: "24%",
    status: "On track",
  },
  {
    name: "Field Workshop",
    revenue: "$32,200",
    margin: "19%",
    status: "Need review",
  },
  {
    name: "Harvest Dinner",
    revenue: "$25,300",
    margin: "29%",
    status: "Completed",
  },
];

const statusVariantMap = {
  "On track": "secondary" as const,
  "Need review": "outline" as const,
  "Completed": "outline" as const,
};

const AnalyticsPage = () => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Analytics
      </p>
      <h1 className="text-2xl font-semibold">Operational Insights</h1>
      <p className="text-sm text-muted-foreground">
        A single dashboard for events, kitchen, and finance performance.
      </p>
    </div>

    <Separator />

    <section>
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">
        Performance Overview
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {performanceCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs ${
                    card.trend === "up"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {card.trend === "up" ? "↑" : "↓"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {card.detail}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">
        Focus Metrics
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {focusMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader>
              <CardDescription className="capitalize">
                {metric.title.toLowerCase()}
              </CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">
        Top Events This Week
      </h2>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topEvents.map((event) => (
                <TableRow key={event.name}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell className="text-right">
                    {event.revenue}
                  </TableCell>
                  <TableCell className="text-right">{event.margin}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[event.status as keyof typeof statusVariantMap] ?? "outline"}>
                      {event.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  </div>
);

export default AnalyticsPage;
