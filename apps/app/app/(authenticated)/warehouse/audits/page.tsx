import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";

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
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    {/* Page Header */}
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Warehouse Audits</h1>
      <p className="text-muted-foreground">
        Track cycle counts, discrepancies, and inspector notes.
      </p>
    </div>

    <Separator />

    {/* Scheduled Audit Rounds Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Scheduled Audit Rounds
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
      {auditRounds.map((audit) => (
        <Card key={audit.title}>
          <CardHeader>
            <CardTitle>{audit.title}</CardTitle>
            <CardDescription>
              <Badge variant={statusVariant[audit.status] ?? "outline"}>
                {audit.status}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{audit.location}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Scheduled</span>
              <span className="font-medium">{audit.scheduled}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Variance</span>
              <span className="font-medium">{audit.variance}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Inspector</span>
              <span className="font-medium">{audit.inspector}</span>
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </section>
  </div>
);

export default WarehouseAuditsPage;
