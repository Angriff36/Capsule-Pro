/**
 * Always-visible demo seed controls on Settings.
 * Seed / clear / reseed via governed SampleData commands (manager/admin).
 */

"use client";

import { useAuth } from "@clerk/nextjs";
import { Button } from "@repo/design-system/components/ui/button";
import { Database, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listSampleDatas,
  sampleDataClear,
  sampleDataReseed,
  sampleDataSeed,
} from "@/app/lib/manifest-client.generated";

const SAMPLE_DATA_ID = "sample-data";

type BusyAction = "seed" | "clear" | "reseed" | null;

function statusLabel(loading: boolean, isSeeded: boolean): string {
  if (loading) {
    return "checking…";
  }
  if (isSeeded) {
    return "sample data is loaded";
  }
  return "not loaded";
}

export function SampleDataPanel() {
  const router = useRouter();
  const { userId } = useAuth();
  const [isSeeded, setIsSeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyAction>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await listSampleDatas();
      setIsSeeded((res?.data ?? []).some((row) => row.isSeeded === true));
    } catch {
      // Non-fatal — actions still work; status may be stale.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus().catch(() => {
      // refreshStatus already swallows list errors
    });
  }, [refreshStatus]);

  const actor = userId ?? "settings";

  const run = async (
    action: Exclude<BusyAction, null>,
    fn: () => Promise<unknown>
  ) => {
    setBusy(action);
    try {
      await fn();
      await refreshStatus();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Sample data action failed."
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-[22px] border border-hairline bg-canvas p-6">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 size-5 text-ink" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="font-medium text-ink text-lg">Demo sample data</h2>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              One click loads example clients, events, kitchen, inventory,
              vendors, vehicles, leads, and related records for this tenant.
              Manager/admin only.
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            Status:{" "}
            <span className="text-ink">{statusLabel(loading, isSeeded)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy !== null || isSeeded}
              onClick={() => {
                run("seed", async () => {
                  await sampleDataSeed({
                    id: SAMPLE_DATA_ID,
                    requestedBy: actor,
                  });
                  toast.success("Sample data loaded.");
                }).catch(() => {
                  // run() toasts errors
                });
              }}
              size="sm"
            >
              {busy === "seed" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Database className="size-4" />
              )}
              Load sample data
            </Button>
            <Button
              disabled={busy !== null || !isSeeded}
              onClick={() => {
                run("reseed", async () => {
                  await sampleDataReseed({
                    id: SAMPLE_DATA_ID,
                    requestedBy: actor,
                  });
                  toast.success("Sample data reseeded.");
                }).catch(() => {
                  // run() toasts errors
                });
              }}
              size="sm"
              variant="outline"
            >
              {busy === "reseed" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Reseed
            </Button>
            <Button
              disabled={busy !== null || !isSeeded}
              onClick={() => {
                run("clear", async () => {
                  await sampleDataClear({
                    id: SAMPLE_DATA_ID,
                    requestedBy: actor,
                    reason: "Cleared from Settings",
                  });
                  toast.success("Sample data cleared.");
                }).catch(() => {
                  // run() toasts errors
                });
              }}
              size="sm"
              variant="outline"
            >
              {busy === "clear" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Clear
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
