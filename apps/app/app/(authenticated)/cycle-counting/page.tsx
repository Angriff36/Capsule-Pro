import { listStorageLocations } from "@/app/lib/manifest-client.generated";
import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { redirect } from "next/navigation";
import {
  createCycleCountSession,
  listCycleCountSessions,
} from "./actions/sessions";

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
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
  const [sessions, storageLocations] = await Promise.all([
    listCycleCountSessions(),
    (await listStorageLocations()).data,
  ]);

  const locations = storageLocations
    .filter((location) => location.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((location) => ({ id: location.id, name: location.name }));

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Inventory / Cycle Counting</MonoLabel>
            <DisplayHeading>Cycle Counting</DisplayHeading>
            <CommandBandLede>
              Manage inventory cycle counts with automated variance tracking and
              adjustments.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-6">
          <SectionHeader
            description="Start a new inventory cycle count session."
            eyebrow="New Session"
            title="Create Count"
          />
          <form
            action={async (formData) => {
              "use server";
              const result = await createCycleCountSession({
                locationId: formData.get("locationId") as string,
                sessionName: formData.get("sessionName") as string,
                countType: "ad_hoc",
                notes: (formData.get("notes") as string) || undefined,
              });

              if (result.success) {
                redirect(`/cycle-counting/${result.session?.sessionId}`);
              }
            }}
            className="rounded-[22px] border border-hairline bg-canvas p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="locationId">Location</Label>
                <Select name="locationId" required>
                  <SelectTrigger id="locationId">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Optional notes..."
                  rows={1}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit">Create Session</Button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <SectionHeader
            count={`${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
            eyebrow="History"
            title="Recent Sessions"
          />

          {sessions.length === 0 ? (
            <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-10 text-center">
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                Empty
              </p>
              <p className="mt-3 text-ink text-sm leading-relaxed">
                No cycle count sessions yet. Create your first session above.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
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
                  {sessions.map(
                    (session: {
                      id: string;
                      sessionId: string;
                      sessionName: string;
                      status: string;
                      countType: string;
                      variancePercentage: number;
                      createdAt: Date;
                    }) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          <a
                            className="text-primary hover:underline"
                            href={`/cycle-counting/${session.sessionId}`}
                          >
                            {session.sessionName}
                          </a>
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize">
                          {session.countType.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              statusVariantMap[session.status] ?? "outline"
                            }
                          >
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
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
