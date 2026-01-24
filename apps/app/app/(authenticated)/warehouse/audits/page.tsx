import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";

const auditRounds = [
  {
    title: "Inbound produce sweep",
    location: "Cold dock A",
    scheduled: "Jan 24 · 08:00",
    variance: "-2 crates",
    inspector: "Harper",
    status: "In progress",
  },
  {
    title: "Dry goods cycle count",
    location: "Dry storage",
    scheduled: "Jan 26 · 10:00",
    variance: "+1 pallet",
    inspector: "Luca",
    status: "Scheduled",
  },
  {
    title: "Freezer integrity review",
    location: "Freezer 3",
    scheduled: "Jan 29 · 07:30",
    variance: "0",
    inspector: "Nia",
    status: "Planned",
  },
];

const statusVariant: Record<string, "secondary" | "outline"> = {
  "In progress": "secondary",
  Scheduled: "outline",
  Planned: "outline",
};

const WarehouseAuditsPage = () => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Warehouse
      </p>
      <h1 className="text-2xl font-semibold">Audits</h1>
      <p className="text-sm text-muted-foreground">
        Track cycle counts, discrepancies, and inspector notes.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      {auditRounds.map((audit) => (
        <Card key={audit.title}>
          <CardHeader>
            <CardTitle>{audit.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Location</span>
              <strong>{audit.location}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Scheduled</span>
              <strong>{audit.scheduled}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Variance</span>
              <strong>{audit.variance}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Inspector</span>
              <strong>{audit.inspector}</strong>
            </div>
            <Badge variant={statusVariant[audit.status] ?? "outline"}>
              {audit.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default WarehouseAuditsPage;
