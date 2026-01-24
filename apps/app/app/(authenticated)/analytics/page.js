Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const table_1 = require("@repo/design-system/components/ui/table");
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
        <card_1.Card key={card.title}>
          <card_1.CardHeader>
            <card_1.CardTitle>{card.value}</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="text-sm font-semibold">{card.title}</p>
            <p className="text-xs text-muted-foreground">{card.detail}</p>
          </card_1.CardContent>
        </card_1.Card>
      ))}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Focus Metrics</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="grid gap-4 md:grid-cols-3">
          {focusMetrics.map((metric) => (
            <div className="space-y-1" key={metric.title}>
              <p className="text-xl font-semibold">{metric.value}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {metric.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </div>
          ))}
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Top Events This Week</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="overflow-x-auto">
          <div className="rounded-md border">
            <table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Event</table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Revenue
                  </table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Margin
                  </table_1.TableHead>
                  <table_1.TableHead>Status</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {topEvents.map((event) => (
                  <table_1.TableRow key={event.name}>
                    <table_1.TableCell>{event.name}</table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {event.revenue}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {event.margin}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <badge_1.Badge
                        variant={
                          event.status === "On track" ? "secondary" : "outline"
                        }
                      >
                        {event.status}
                      </badge_1.Badge>
                    </table_1.TableCell>
                  </table_1.TableRow>
                ))}
              </table_1.TableBody>
            </table_1.Table>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  </div>
);
exports.default = AnalyticsPage;
