"use client";

/**
 * PrepList detail — the canonical page for a single saved prep list. This is
 * the click-through target for order-line provenance (a draft requisition
 * line's sourcePrepListIds land here) and for the weekly-ordering surface.
 * Shows the list header, its source event, and every item with station and
 * scaled quantities.
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
import { executeCommand } from "@/app/lib/manifest-client";
import {
  getPrepList,
  listPrepListItems,
} from "@/app/lib/manifest-client.generated";
import type {
  PrepList,
  PrepListItem,
} from "@/app/lib/manifest-types.generated";
import { OperationalPageShell } from "../../../components/operational-page-shell";

export default function PrepListDetailPage() {
  const params = useParams<{ prepListId: string }>();
  const prepListId = params?.prepListId ?? "";
  const [prepList, setPrepList] = useState<PrepList | null>(null);
  const [items, setItems] = useState<PrepListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, allItems] = await Promise.all([
        getPrepList(prepListId),
        listPrepListItems(),
      ]);
      setPrepList((list as PrepList) ?? null);
      setItems(
        allItems.data.filter(
          (item) => (item as { prepListId?: string }).prepListId === prepListId
        )
      );
    } catch (error) {
      console.error("Failed to load prep list:", error);
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
        eyebrow="Kitchen / Prep Lists"
        title="Prep list not found"
      >
        <Button asChild variant="outline">
          <Link href="/kitchen/prep-lists">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to prep lists
          </Link>
        </Button>
      </OperationalPageShell>
    );
  }

  const record = prepList as PrepList & {
    eventId?: string;
    status?: string;
    totalItems?: number;
  };

  return (
    <OperationalPageShell
      actions={
        <div className="flex items-center gap-2">
          {record.status === "draft" && (
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
        record.eventId ? (
          <span>
            For event{" "}
            <Link
              className="underline underline-offset-2"
              href={`/events/${record.eventId}`}
            >
              {record.eventId.slice(0, 8)}
            </Link>{" "}
            · <Badge variant="outline">{record.status}</Badge>
          </span>
        ) : (
          <Badge variant="outline">{record.status}</Badge>
        )
      }
      eyebrow="Kitchen / Prep Lists"
      title={(record as { name?: string }).name ?? "Prep list"}
    >
      <Card>
        <CardHeader>
          <CardTitle>Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No items on this list.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Dish</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const row = item as PrepListItem & {
                    dishName?: string;
                    ingredientId?: string;
                    ingredientName?: string;
                    preparationNotes?: string;
                    scaledQuantity?: number;
                    scaledUnit?: string;
                    stationName?: string;
                  };
                  return (
                    <TableRow key={(row as { id?: string }).id}>
                      <TableCell>
                        {row.ingredientId ? (
                          <Link
                            className="underline-offset-2 hover:underline"
                            href={`/inventory/items/${row.ingredientId}`}
                          >
                            {row.ingredientName}
                          </Link>
                        ) : (
                          row.ingredientName
                        )}
                      </TableCell>
                      <TableCell>{row.dishName || "—"}</TableCell>
                      <TableCell>{row.stationName || "—"}</TableCell>
                      <TableCell className="text-right">
                        {row.scaledQuantity} {row.scaledUnit}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.preparationNotes || ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </OperationalPageShell>
  );
}
