Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
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
const statusVariant = {
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
        <card_1.Card key={audit.title}>
          <card_1.CardHeader>
            <card_1.CardTitle>{audit.title}</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-2 text-sm text-muted-foreground">
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
            <badge_1.Badge variant={statusVariant[audit.status] ?? "outline"}>
              {audit.status}
            </badge_1.Badge>
          </card_1.CardContent>
        </card_1.Card>
      ))}
    </div>
  </div>
);
exports.default = WarehouseAuditsPage;
