import { redirect } from "next/navigation";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ClipboardListIcon } from "lucide-react";
import {
  createCycleCountSession,
  listCycleCountSessions,
} from "./actions/sessions";

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  finalized: "default",
  in_progress: "secondary",
  draft: "outline",
};

const statusLabelMap: Record<string, string> = {
  finalized: "Finalized",
  in_progress: "In Progress",
  draft: "Draft",
};

export default async function CycleCountingPage() {
  const sessions = await listCycleCountSessions();

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Cycle Counting</h1>
        <p className="text-muted-foreground">
          Manage inventory cycle counts with automated variance tracking and adjustments.
        </p>
      </div>

      <Separator />

      {/* Create New Session Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Create New Session
        </h2>
        <Card>
          <CardContent className="pt-6">
            <form
              action={async (formData) => {
                "use server";
                const result = await createCycleCountSession({
                  locationId: "00000000-0000-0000-0000-000000000000",
                  sessionName: formData.get("sessionName") as string,
                  countType: "ad_hoc",
                  notes: (formData.get("notes") as string) || undefined,
                });

                if (result.success) {
                  redirect(`/cycle-counting/${result.session?.sessionId}`);
                }
              }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="sessionName">Session Name</Label>
                <Input
                  id="sessionName"
                  name="sessionName"
                  placeholder="e.g., Main Warehouse Count"
                  required
                  type="text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Optional notes..."
                  rows={3}
                />
              </div>

              <Button type="submit">
                Create New Session
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Recent Sessions Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Recent Sessions
        </h2>

        {sessions.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardListIcon />
              </EmptyMedia>
              <EmptyTitle>No cycle count sessions found</EmptyTitle>
              <EmptyDescription>
                Create a new session to get started with inventory cycle counting.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      <a
                        className="text-primary hover:underline"
                        href={`/cycle-counting/${session.sessionId}`}
                      >
                        {session.sessionName}
                      </a>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {session.countType.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariantMap[session.status] ?? "outline"}>
                        {statusLabelMap[session.status] ?? session.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {session.variancePercentage.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
}
