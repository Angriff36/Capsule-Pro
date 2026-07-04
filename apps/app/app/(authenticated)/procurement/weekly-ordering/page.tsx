"use client";

/**
 * Weekly ordering: pick a week, see its events + prep lists, finalize the
 * outstanding lists (finalizing feeds the governed demand pipeline), and
 * review the resulting supplier-grouped draft requisitions — including the
 * UNRESOLVED draft for demand that cannot be safely ordered. Every quantity
 * shown here was computed by the deterministic prep-demand engine (net
 * demand, unit-converted, pack-rounded); this page only reads and dispatches
 * governed commands.
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
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
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiUrl } from "@/app/lib/api";
import { executeCommand } from "@/app/lib/manifest-client";
import { OperationalPageShell } from "../../components/operational-page-shell";

interface PrepListRow {
  id: string;
  name: string;
  status: string;
  totalItems: number | null;
}

interface EventRow {
  eventDate: string;
  guestCount: number | null;
  id: string;
  prepLists: PrepListRow[];
  status: string;
  title: string;
}

interface DraftItemRow {
  estimatedTotalCost: string;
  estimatedUnitCost: string;
  id: string;
  itemId: string;
  itemName: string;
  notes: string;
  quantityRequested: number;
  sourcePrepListIds: string[];
  specifications: string;
}

interface DraftRow {
  estimatedTotal: string;
  id: string;
  itemCount: number;
  items: DraftItemRow[];
  requisitionNumber: string;
  sourceType: string;
  status: string;
  subtotal: string;
  supplierId: string;
  supplierName: string;
  supplierVendorLinked: boolean;
}

interface WeeklyOrderingData {
  drafts: DraftRow[];
  events: EventRow[];
  range: { end: string; start: string };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function startOfWeekLocal(date: Date): Date {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7; // Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toCsv(draft: DraftRow): string {
  const header = "Item,SKU,Quantity,Unit Cost,Line Total,Source Prep Lists";
  const rows = draft.items.map((item) =>
    [
      JSON.stringify(item.itemName),
      JSON.stringify(item.specifications),
      item.quantityRequested,
      item.estimatedUnitCost,
      item.estimatedTotalCost,
      JSON.stringify(item.sourcePrepListIds.join(" ")),
    ].join(",")
  );
  return [
    `Supplier,${JSON.stringify(draft.supplierName || "UNRESOLVED")}`,
    `Requisition,${JSON.stringify(draft.requisitionNumber)}`,
    "",
    header,
    ...rows,
    "",
    `Subtotal,,,,${draft.subtotal},`,
  ].join("\n");
}

function downloadCsv(draft: DraftRow) {
  const blob = new Blob([toCsv(draft)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${draft.requisitionNumber}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function WeeklyOrderingPage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeekLocal(new Date())
  );
  const [data, setData] = useState<WeeklyOrderingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const weekEnd = useMemo(
    () => new Date(weekStart.getTime() + WEEK_MS),
    [weekStart]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        apiUrl(
          `/api/procurement/weekly-ordering?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
        ),
        { credentials: "include" }
      );
      const body = await response.json();
      setData((body.data ?? body) as WeeklyOrderingData);
    } catch (error) {
      console.error("Failed to load weekly ordering data:", error);
      toast.error("Failed to load weekly ordering data");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const finalizePrepList = async (prepListId: string) => {
    setBusy(prepListId);
    try {
      await executeCommand("PrepList", "finalize", { id: prepListId });
      toast.success("Prep list finalized — demand added to supplier drafts");
      await load();
    } catch (error) {
      console.error("Failed to finalize prep list:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to finalize prep list"
      );
    } finally {
      setBusy(null);
    }
  };

  const draftLists = (data?.events ?? []).flatMap((event) =>
    event.prepLists
      .filter((list) => list.status === "draft")
      .map((list) => ({ event, list }))
  );
  const supplierDrafts = (data?.drafts ?? []).filter(
    (draft) => draft.sourceType !== "prep_demand_unresolved"
  );
  const unresolvedDrafts = (data?.drafts ?? []).filter(
    (draft) => draft.sourceType === "prep_demand_unresolved"
  );

  return (
    <OperationalPageShell
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              setWeekStart(new Date(weekStart.getTime() - WEEK_MS))
            }
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" /> Prev week
          </Button>
          <Button
            onClick={() => setWeekStart(startOfWeekLocal(new Date()))}
            size="sm"
            variant="outline"
          >
            This week
          </Button>
          <Button
            onClick={() =>
              setWeekStart(new Date(weekStart.getTime() + WEEK_MS))
            }
            size="sm"
            variant="outline"
          >
            Next week <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      }
      description={`${weekStart.toLocaleDateString()} – ${new Date(weekEnd.getTime() - DAY_MS).toLocaleDateString()} · finalize the week's prep lists, then review the supplier-grouped draft orders they produce.`}
      eyebrow="Procurement / Weekly Ordering"
      title="Weekly ordering"
    >
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Events & prep lists this week</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.events.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Prep list</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.events.flatMap((event) =>
                      (event.prepLists.length ? event.prepLists : [null]).map(
                        (list) => (
                          <TableRow key={`${event.id}-${list?.id ?? "none"}`}>
                            <TableCell>
                              <Link
                                className="underline-offset-2 hover:underline"
                                href={`/events/${event.id}`}
                              >
                                {event.title}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {new Date(event.eventDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {list ? (
                                <Link
                                  className="underline-offset-2 hover:underline"
                                  href={`/kitchen/prep-lists/${list.id}`}
                                >
                                  {list.name}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">
                                  No prep list yet
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {list ? (
                                <Badge
                                  variant={
                                    list.status === "draft"
                                      ? "outline"
                                      : "secondary"
                                  }
                                >
                                  {list.status}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {list?.status === "draft" ? (
                                <Button
                                  disabled={busy === list.id}
                                  onClick={() => finalizePrepList(list.id)}
                                  size="sm"
                                >
                                  {busy === list.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Finalize"
                                  )}
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        )
                      )
                    )}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No events in this week.
                </p>
              )}
              {draftLists.length > 0 && (
                <p className="mt-3 text-muted-foreground text-sm">
                  {draftLists.length} prep list(s) still draft — finalize them
                  to add their demand to the supplier drafts below.
                </p>
              )}
            </CardContent>
          </Card>

          {supplierDrafts.map((draft) => (
            <Card key={draft.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {draft.supplierName || draft.supplierId} —{" "}
                  {draft.requisitionNumber}
                  {!draft.supplierVendorLinked && (
                    <Badge className="ml-2" variant="outline">
                      no purchasing vendor linked
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => downloadCsv(draft)}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="mr-1 h-4 w-4" /> Export CSV
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/procurement/requisitions/${draft.id}`}>
                      Review & submit
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                      <TableHead>From prep lists</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link
                            className="underline-offset-2 hover:underline"
                            href={`/inventory/items/${item.itemId}`}
                          >
                            {item.itemName}
                          </Link>
                        </TableCell>
                        <TableCell>{item.specifications || "—"}</TableCell>
                        <TableCell className="text-right">
                          {item.quantityRequested}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.estimatedUnitCost}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.estimatedTotalCost}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.sourcePrepListIds.map((prepListId) => (
                              <Link
                                href={`/kitchen/prep-lists/${prepListId}`}
                                key={prepListId}
                              >
                                <Badge variant="secondary">
                                  {prepListId.slice(0, 8)}
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 text-right font-medium text-sm">
                  Subtotal: ${draft.subtotal}
                </p>
              </CardContent>
            </Card>
          ))}

          {unresolvedDrafts.map((draft) => (
            <Card className="border-destructive/40" key={draft.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Unresolved demand — cannot be safely ordered
                </CardTitle>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/procurement/requisitions/${draft.id}`}>
                    Review
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Why unresolved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link
                            className="underline-offset-2 hover:underline"
                            href={`/inventory/items/${item.itemId}`}
                          >
                            {item.itemName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantityRequested}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.notes}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 text-muted-foreground text-sm">
                  Fix these by linking the item to a supplier, adding a supplier
                  catalog entry (SKU + pack size), or adding the missing unit
                  conversion — then re-finalize the affected prep lists.
                </p>
              </CardContent>
            </Card>
          ))}

          {supplierDrafts.length === 0 && unresolvedDrafts.length === 0 && (
            <Card>
              <CardContent className="p-6 text-muted-foreground text-sm">
                No open draft orders. Finalize prep lists above to generate
                supplier-grouped drafts.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </OperationalPageShell>
  );
}
