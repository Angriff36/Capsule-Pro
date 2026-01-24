"use client";

Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const react_1 = require("react");
const requestQueue = [
  {
    id: "req-1",
    employee: "Avery Lee",
    type: "Shift swap",
    shift: "Line Cook · Jan 29 · 4pm-12am",
    submitted: "5m ago",
    status: "Pending manager",
  },
  {
    id: "req-2",
    employee: "Caleb Ortiz",
    type: "Time-off",
    shift: "Server · Feb 03",
    submitted: "20m ago",
    status: "Needs coverage",
  },
  {
    id: "req-3",
    employee: "Nia Robinson",
    type: "Availability update",
    shift: "Prep · Tuesdays",
    submitted: "1h ago",
    status: "Draft",
  },
];
const SchedulingRequestsPage = () => {
  const [filter, setFilter] = (0, react_1.useState)("");
  const filteredRequests = requestQueue.filter((request) =>
    request.employee.toLowerCase().includes(filter.toLowerCase())
  );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Scheduling
        </p>
        <h1 className="text-2xl font-semibold">Request Queue</h1>
        <p className="text-sm text-muted-foreground">
          Approve shift swaps, time-off requests, and preference changes.
        </p>
      </div>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Request filters</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="flex flex-col gap-3 md:flex-row">
          <input_1.Input
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search by team member"
            value={filter}
          />
          <button_1.Button variant="outline">Show all</button_1.Button>
        </card_1.CardContent>
      </card_1.Card>

      <div className="space-y-3">
        {filteredRequests.map((request) => (
          <card_1.Card className="border-primary/30" key={request.id}>
            <card_1.CardHeader className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">{request.employee}</p>
                <badge_1.Badge variant="secondary">
                  {request.status}
                </badge_1.Badge>
              </div>
              <p className="text-sm text-muted-foreground">{request.type}</p>
            </card_1.CardHeader>
            <card_1.CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>{request.shift}</p>
              <p>Submitted {request.submitted}</p>
              <div className="mt-2 flex gap-2">
                <button_1.Button size="sm">Approve</button_1.Button>
                <button_1.Button size="sm" variant="ghost">
                  Request info
                </button_1.Button>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        ))}
      </div>
    </div>
  );
};
exports.default = SchedulingRequestsPage;
