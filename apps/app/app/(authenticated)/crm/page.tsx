import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";

const clientMetrics = [
  {
    label: "Active clients",
    value: "128",
    detail: "+5 since last week",
  },
  {
    label: "Open proposals",
    value: "34",
    detail: "12 awaiting signatures",
  },
  {
    label: "Venue partners",
    value: "42",
    detail: "New tours scheduled this week",
  },
];

const topClients = [
  {
    name: "Harmonic Events",
    ltv: 248_000,
    proposals: 6,
    lastActivity: "Jan 22",
  },
  {
    name: "Grove & Co.",
    ltv: 193_500,
    proposals: 4,
    lastActivity: "Jan 21",
  },
  {
    name: "Windward Hospitality",
    ltv: 171_200,
    proposals: 3,
    lastActivity: "Jan 20",
  },
];

const recentCommunications = [
  {
    client: "Harmonic Events",
    channel: "Email",
    summary: "Shared revised proposal and menu add-ons.",
    status: "Waiting reply",
  },
  {
    client: "Field & Feast",
    channel: "Call",
    summary: "Confirmed mid-service breaks and beverage schedule.",
    status: "Resolved",
  },
  {
    client: "Harbor Ventures",
    channel: "Slack",
    summary: "Requested additional staffing for VIP lounge.",
    status: "Needs follow-up",
  },
];

const CrmPage = () => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    {/* Page Header */}
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">CRM Overview</h1>
      <p className="text-muted-foreground">
        Centralize account health, pipeline, and communications in one place.
      </p>
    </div>

    <Separator />

    {/* Performance Overview Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Performance Overview
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {clientMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle>{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    {/* Clients & Communications Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Clients & Communications
      </h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Clients (by LTV)</CardTitle>
            <CardDescription>Track who drives repeat business.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Proposals</TableHead>
                    <TableHead className="text-right">LTV</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClients.map((client) => (
                    <TableRow key={client.name}>
                      <TableCell>{client.name}</TableCell>
                      <TableCell className="text-right">
                        {client.proposals}
                      </TableCell>
                      <TableCell className="text-right">
                        ${client.ltv.toLocaleString()}
                      </TableCell>
                      <TableCell>{client.lastActivity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Communications</CardTitle>
            <CardDescription>
              High-touch conversations this week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCommunications.map((note) => (
              <div
                className="rounded-lg border border-border/70 px-4 py-3"
                key={note.client}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{note.client}</p>
                  <Badge
                    variant={
                      note.status === "Resolved" ? "secondary" : "outline"
                    }
                  >
                    {note.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{note.channel}</p>
                <p className="text-sm text-muted-foreground">{note.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
);

export default CrmPage;
