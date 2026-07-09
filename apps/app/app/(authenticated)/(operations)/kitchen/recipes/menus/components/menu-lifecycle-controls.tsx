"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  type MenuLifecycleStatus,
  menuStatusLabel,
  normalizeMenuStatus,
} from "../menu-lifecycle";
import {
  archiveMenuManifest,
  publishMenuManifest,
  restoreMenuManifest,
  unpublishMenuManifest,
} from "../menu-lifecycle-actions";

interface MenuLifecycleControlsProps {
  hasPricing: boolean;
  menuId: string;
  status: string;
}

function badgeVariantForStatus(
  status: MenuLifecycleStatus
): "default" | "secondary" | "outline" {
  if (status === "published") {
    return "default";
  }
  if (status === "archived") {
    return "secondary";
  }
  return "outline";
}

export function MenuLifecycleControls({
  menuId,
  status: rawStatus,
  hasPricing,
}: MenuLifecycleControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = normalizeMenuStatus(rawStatus);

  const run = (action: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error || "Lifecycle action failed.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-sm border border-input bg-background p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="font-medium text-sm">Publication status</p>
          <p className="text-muted-foreground text-xs">
            Manifest lifecycle: draft → published → archived
          </p>
        </div>
        <Badge variant={badgeVariantForStatus(status)}>
          {menuStatusLabel(status)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <Button
            disabled={isPending || !hasPricing}
            onClick={() => run(() => publishMenuManifest(menuId))}
            size="sm"
            type="button"
          >
            {isPending ? "Working…" : "Publish"}
          </Button>
        ) : null}

        {status === "published" ? (
          <Button
            disabled={isPending}
            onClick={() => run(() => unpublishMenuManifest(menuId))}
            size="sm"
            type="button"
            variant="outline"
          >
            {isPending ? "Working…" : "Unpublish"}
          </Button>
        ) : null}

        {status === "archived" ? (
          <Button
            disabled={isPending}
            onClick={() => run(() => restoreMenuManifest(menuId))}
            size="sm"
            type="button"
          >
            {isPending ? "Working…" : "Restore to draft"}
          </Button>
        ) : null}

        {status === "draft" || status === "published" ? (
          <Button
            disabled={isPending}
            onClick={() => run(() => archiveMenuManifest(menuId))}
            size="sm"
            type="button"
            variant="outline"
          >
            {isPending ? "Working…" : "Archive"}
          </Button>
        ) : null}
      </div>

      {status === "draft" && !hasPricing ? (
        <p className="text-amber-700 text-xs">
          Add a base price or price per person before publishing.
        </p>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

export function MenuStatusBadge({ status }: { status: string }) {
  const normalized = normalizeMenuStatus(status);
  return (
    <Badge variant={badgeVariantForStatus(normalized)}>
      {menuStatusLabel(normalized)}
    </Badge>
  );
}
