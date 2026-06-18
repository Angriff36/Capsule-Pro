/**
 * SampleDataImportButton — one-click "Load sample data" affordance for empty states.
 *
 * Drops into the `secondaryAction` slot of the design-system empty-state components.
 * Dispatches the governed `SampleData.seed` command (manifest-client `sampleDataSeed`),
 * which the runtime turns into a real demo-data seed (Event/Client/Recipe/PrepTask/
 * Inventory rows) via the sample-data seed effect middleware.
 *
 * Gating: there is no `isSandbox` tenant flag in the schema, so the closest faithful
 * signal for "sandbox onboarding" is whether sample data has been loaded yet. The
 * button self-hides once the tenant's SampleData row reports `isSeeded`. Authorization
 * is enforced server-side by the `SampleData.seed` policy (manager/admin only); the
 * empty-state components additionally only render this slot for roles that can create.
 */

"use client";

import { useAuth } from "@clerk/nextjs";
import { Button } from "@repo/design-system/components/ui/button";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listSampleDatas,
  sampleDataSeed,
} from "@/app/lib/manifest-client.generated";

/**
 * Stable per-tenant id for the SampleData singleton. The runtime bootstraps the
 * instance from the request body on first seed; reusing one id keeps clear/reseed
 * and the "already seeded?" check pointed at the same row.
 */
const SAMPLE_DATA_ID = "sample-data";

interface SampleDataImportButtonProps {
  /** Button label. */
  label?: string;
  /**
   * Called after a successful seed so a client-fetched list can re-load. Server
   * components reload via `router.refresh()`; client lists should pass their fetcher.
   */
  onSeeded?: () => void;
}

export function SampleDataImportButton({
  label = "Load sample data",
  onSeeded,
}: SampleDataImportButtonProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const [checking, setChecking] = useState(true);
  const [alreadySeeded, setAlreadySeeded] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    let active = true;
    listSampleDatas()
      .then((res) => {
        if (!active) {
          return;
        }
        const seeded = (res?.data ?? []).some((row) => row.isSeeded === true);
        setAlreadySeeded(seeded);
      })
      .catch(() => {
        // Non-fatal: if the check fails we still offer the button — the seed
        // command's own `isSeeded == false` guard prevents a double-seed.
      })
      .finally(() => {
        if (active) {
          setChecking(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Hide while checking, or once sample data is present.
  if (checking || alreadySeeded) {
    return null;
  }

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await sampleDataSeed({
        id: SAMPLE_DATA_ID,
        // `requestedBy` only needs to be a non-empty actor id (guard); the real
        // authorization is the server-side manager/admin policy.
        requestedBy: userId ?? "onboarding",
      });
      toast.success(
        "Sample data loaded — your workspace is now populated with example records."
      );
      setAlreadySeeded(true);
      onSeeded?.();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't load sample data. Please try again."
      );
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button
      disabled={isSeeding}
      onClick={handleSeed}
      size="sm"
      variant="outline"
    >
      <Sparkles className="size-4" />
      {isSeeding ? "Loading sample data…" : label}
    </Button>
  );
}
