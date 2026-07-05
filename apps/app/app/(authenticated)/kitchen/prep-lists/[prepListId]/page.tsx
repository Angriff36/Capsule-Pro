"use client";

/**
 * PrepList detail — the canonical page for a single saved prep list. This is
 * the click-through target for order-line provenance (a draft requisition
 * line's sourcePrepListIds land here) and for the weekly-ordering surface.
 * Reads the hand-written GET /api/kitchen/prep-lists/[id] (top-level shape
 * with eventTitle + station-grouped items).
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
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiUrl } from "@/app/lib/api";
import { executeCommand } from "@/app/lib/manifest-client";
import { OperationalPageShell } from "../../../components/operational-page-shell";

interface PrepListItemRow {
  id: string;
  ingredientId: string | null;
  ingredientName: string;
  isCompleted: boolean;
  preparationNotes: string | null;
  scaledQuantity: number;
  scaledUnit: string;
}

interface StationGroup {
  items: PrepListItemRow[];
  stationId: string;
  stationName: string;
}

interface PrepListDetail {
  batchMultiplier: number;
  eventDate: string | null;
  eventId: string;
  eventTitle: string | null;
  id: string;
  name: string;
  notes: string | null;
  stations: StationGroup[];
  status: string;
  totalItems: number;
}

export default function PrepListDetailPage() {
  const params = useParams<{ prepListId: string }>();
  const prepListId = params?.prepListId ?? "";
  const [prepList, setPrepList] = useState<PrepListDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        apiUrl(`/api/kitchen/prep-lists/${prepListId}`),
        { credentials: "include" }
      );
      if (!response.ok) {
        setPrepList(null);
        // A missing record and a backend failure are different states —
        // don't report a 500 as "not found".
        setLoadError(
          response.status === 404
            ? null
            : `Failed to load prep list (HTTP ${response.status})`
        );
        return;
      }
      setPrepList((await response.json()) as PrepListDetail);
      setLoadError(null);
    } catch (error) {
      console.error("Failed to load prep list:", error);
      setLoadError("Failed to load prep list — network or server error");
      toast.error("Failed to load prep list");
    } finally {
      setLoading(false);
    }
  }, [prepListId]);

  useEffect(() => {
    load();
  }, [load]);

  const finalize = async () => {
    setBusy(true);
    try {
      await executeCommand("PrepList", "finalize", { id: prepListId });
      toast.success(
        "Prep list finalized — demand added to supplier order drafts"
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to finalize"
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prepList) {
    return (
      <OperationalPageShell
        description={loadError ?? undefined}
        eyebrow="Kitchen / Prep Lists"
        title={loadError ? "Could not load prep list" : "Prep list not found"}
        withCanvas={false}
      >
        <div className="flex items-center gap-2">
          {loadError && (
            <Button onClick={load} variant="default">
              Retry
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/kitchen/prep-lists">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to prep lists
            </Link>
          </Button>
        </div>
      </OperationalPageShell>
    );
  }

  const itemCount = prepList.stations.reduce(
    (sum, station) => sum + station.items.length,
    0
  );

  return (
    <OperationalPageShell
      actions={
        <div className="flex items-center gap-2">
          {prepList.status === "draft" && (
            <Button disabled={busy} onClick={finalize} size="sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalize"}
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href="/procurement/weekly-ordering">Weekly ordering</Link>
          </Button>
        </div>
      }
      description={
        <span>
          For event{" "}
          <Link
            className="underline underline-offset-2"
            href={`/events/${prepList.eventId}`}
          >
            {prepList.eventTitle ?? prepList.eventId.slice(0, 8)}
          </Link>{" "}
          · <Badge variant="outline">{prepList.status}</Badge>
        </span>
      }
      eyebrow="Kitchen / Prep Lists"
      title={prepList.name}
      withCanvas={false}
    >
      {prepList.stations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-muted-foreground text-sm">
            No items on this list.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {prepList.stations.map((station) => (
            <Card key={station.stationId}>
              <CardHeader>
                <CardTitle>
                  {station.stationName || "Unassigned station"} (
                  {station.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Done</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {station.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.ingredientId ? (
                            <Link
                              className="underline-offset-2 hover:underline"
                              href={`/kitchen/ingredients/${item.ingredientId}`}
                            >
                              {item.ingredientName}
                            </Link>
                          ) : (
                            item.ingredientName
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.scaledQuantity} {item.scaledUnit}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.preparationNotes || ""}
                        </TableCell>
                        <TableCell>
                          {item.isCompleted ? (
                            <Badge variant="secondary">done</Badge>
                          ) : (
                            ""
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
          <p className="text-muted-foreground text-sm">
            {itemCount} item(s) across {prepList.stations.length} station(s).
          </p>
        </div>
      )}
    </OperationalPageShell>
  );
}
