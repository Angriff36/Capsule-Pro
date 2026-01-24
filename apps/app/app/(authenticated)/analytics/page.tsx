import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
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

const performanceCards = [
  {
    title: "Weekly revenue",
    value: "$142,000",
    detail: "+8% vs. last week",
  },
  {
    title: "Labor efficiency",
    value: "92%",
    detail: "2% rebound after labor reforecast",
  },
  {
    title: "Waste reduction",
    value: "-12%",
    detail: "Down vs. historical baseline",
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

    <div className="grid gap-4 md:grid-cols-3">
      {performanceCards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle>{card.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{card.title}</p>
            <p className="text-xs text-muted-foreground">{card.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Focus Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {focusMetrics.map((metric) => (
            <div key={metric.title} className="space-y-1">
              <p className="text-xl font-semibold">{metric.value}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {metric.title}
              </p>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Events This Week</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="rounded-md border">
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
                    <TableCell>{event.name}</TableCell>
                    <TableCell className="text-right">{event.revenue}</TableCell>
                    <TableCell className="text-right">{event.margin}</TableCell>
                    <TableCell>
                      <Badge variant={event.status === "On track" ? "secondary" : "outline"}>
                        {event.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default AnalyticsPage;
