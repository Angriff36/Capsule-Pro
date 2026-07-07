"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { ImagePlus, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { dishUpdate } from "@/app/lib/manifest-client.generated";
import { updateDishPresentationImage } from "../../actions-manifest-v2";

// "Update photo" affordance for the finished-product image. The photo lives
// on the dish (Dish.presentationImageUrl): file uploads go through a server
// action (@repo/storage put + governed Dish.update) and URL pastes dispatch
// the governed Dish.update command directly — both then refresh the page.

export function UpdatePhotoControl({
  dishId,
  hasImage,
}: {
  dishId: string;
  hasImage: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);

  const handleFile = async (file: File) => {
    setPending(true);
    try {
      const formData = new FormData();
      formData.append("imageFile", file);
      const result = await updateDishPresentationImage(dishId, formData);
      if (!result.success) {
        toast.error(result.error ?? "Failed to upload photo");
        return;
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photo"
      );
    } finally {
      setPending(false);
    }
  };

  const handleUrlSave = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    setPending(true);
    try {
      await dishUpdate({ id: dishId, presentationImageUrl: trimmed });
      setUrlOpen(false);
      setUrl("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update photo"
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            // handleFile catches its own errors — safe to fire-and-forget.
            handleFile(file);
          }
          event.target.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          size="sm"
          variant="outline"
        >
          <ImagePlus className="size-3.5" />
          {hasImage ? "Update photo" : "Add photo"}
        </Button>
        <Button
          disabled={pending}
          onClick={() => setUrlOpen((o) => !o)}
          size="sm"
          variant="ghost"
        >
          <Link2 className="size-3.5" />
          Use URL
        </Button>
      </div>
      {urlOpen && (
        <div className="flex items-center gap-1.5">
          <Input
            className="h-8 text-[13px]"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            value={url}
          />
          <Button
            disabled={pending || !url.trim()}
            onClick={handleUrlSave}
            size="sm"
            variant="outline"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
