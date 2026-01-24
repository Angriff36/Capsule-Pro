"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { useState } from "react";

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
  const [filter, setFilter] = useState("");

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

      <Card>
        <CardHeader>
          <CardTitle>Request filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Input
            placeholder="Search by team member"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <Button variant="outline">Show all</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="border-primary/30">
            <CardHeader className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">{request.employee}</p>
                <Badge variant="secondary">{request.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{request.type}</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>{request.shift}</p>
              <p>Submitted {request.submitted}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm">Approve</Button>
                <Button size="sm" variant="ghost">
                  Request info
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SchedulingRequestsPage;
