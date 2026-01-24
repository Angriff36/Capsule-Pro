import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
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
    ltv: 248000,
    proposals: 6,
    lastActivity: "Jan 22",
  },
  {
    name: "Grove & Co.",
    ltv: 193500,
    proposals: 4,
    lastActivity: "Jan 21",
  },
  {
    name: "Windward Hospitality",
    ltv: 171200,
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
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        CRM
      </p>
      <h1 className="text-2xl font-semibold">Client & Venue Overview</h1>
      <p className="text-sm text-muted-foreground">
        Centralize account health, pipeline, and communications in one place.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {clientMetrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader>
            <CardTitle>{metric.value}</CardTitle>
            <CardDescription>{metric.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{metric.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
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
          <CardDescription>High-touch conversations this week.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentCommunications.map((note) => (
            <div
              key={note.client}
              className="rounded-lg border border-border/70 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{note.client}</p>
                <Badge variant={note.status === "Resolved" ? "secondary" : "outline"}>
                  {note.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {note.channel}
              </p>
              <p className="text-sm text-muted-foreground">{note.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

export default CrmPage;
