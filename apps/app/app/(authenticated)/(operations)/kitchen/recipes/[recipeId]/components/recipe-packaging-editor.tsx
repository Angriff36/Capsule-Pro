"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { recipeVersionSetPackaging } from "@/app/lib/manifest-client.generated";

export interface RecipePackagingNotes {
  bringHot: string;
  cookOnSite: string;
  dropOff: string;
}

/**
 * Authors packaging / event-build notes on the latest RecipeVersion via
 * governed RecipeVersion.setPackaging. Display lives in the cookbook section;
 * this control is the only product write path for those fields.
 */
export function RecipePackagingEditor({
  packaging,
  recipeVersionId,
}: {
  packaging: RecipePackagingNotes;
  recipeVersionId: string;
}) {
  const router = useRouter();
  const [dropOff, setDropOff] = useState(packaging.dropOff);
  const [bringHot, setBringHot] = useState(packaging.bringHot);
  const [cookOnSite, setCookOnSite] = useState(packaging.cookOnSite);
  const [isPending, startTransition] = useTransition();

  const dirty =
    dropOff !== packaging.dropOff ||
    bringHot !== packaging.bringHot ||
    cookOnSite !== packaging.cookOnSite;

  const handleSave = () => {
    startTransition(async () => {
      try {
        await recipeVersionSetPackaging({
          id: recipeVersionId,
          dropOff,
          bringHot,
          cookOnSite,
        });
        toast.success("Packaging notes saved");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save packaging notes"
        );
      }
    });
  };

  return (
    <div className="space-y-4 rounded-card border border-hairline bg-canvas p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
            Drop-off
            <span className="ml-2 normal-case tracking-normal">
              · ready to serve
            </span>
          </span>
          <Textarea
            className="min-h-[88px] text-[15px]"
            disabled={isPending}
            onChange={(e) => setDropOff(e.target.value)}
            placeholder="Packaging for drop-off service"
            value={dropOff}
          />
        </label>
        <label className="space-y-2">
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
            Bring hot
            <span className="ml-2 normal-case tracking-normal">
              · hot hold + serve
            </span>
          </span>
          <Textarea
            className="min-h-[88px] text-[15px]"
            disabled={isPending}
            onChange={(e) => setBringHot(e.target.value)}
            placeholder="Packaging for bring-hot service"
            value={bringHot}
          />
        </label>
        <label className="space-y-2">
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
            Cook on-site
            <span className="ml-2 normal-case tracking-normal">
              · finish at event
            </span>
          </span>
          <Textarea
            className="min-h-[88px] text-[15px]"
            disabled={isPending}
            onChange={(e) => setCookOnSite(e.target.value)}
            placeholder="Packaging for cook-on-site service"
            value={cookOnSite}
          />
        </label>
      </div>
      <div className="flex justify-end">
        <Button
          disabled={isPending || !dirty}
          onClick={handleSave}
          size="sm"
          type="button"
        >
          {isPending ? "Saving…" : "Save packaging"}
        </Button>
      </div>
    </div>
  );
}
