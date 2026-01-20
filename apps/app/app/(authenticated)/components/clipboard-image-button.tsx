"use client";

import type { ClipboardEvent, MouseEvent } from "react";
import { UploadIcon } from "lucide-react";

type ClipboardImageButtonProps = {
  label: string;
  onImage: (file: File) => void;
  disabled?: boolean;
  className?: string;
  showUploadIcon?: boolean;
};

const extractClipboardImage = (event: ClipboardEvent<HTMLButtonElement>) => {
  const files = Array.from(event.clipboardData.files ?? []);
  const directFile = files.find((file) => file.type.startsWith("image/"));
  if (directFile) {
    return directFile;
  }

  const items = Array.from(event.clipboardData.items ?? []);
  const item = items.find(
    (entry) => entry.kind === "file" && entry.type.startsWith("image/"),
  );
  return item?.getAsFile() ?? null;
};

const readClipboardImage = (
  event: MouseEvent<HTMLButtonElement>,
  onImage: (file: File) => void,
) => {
  event.currentTarget.focus();
  if (!navigator.clipboard?.read) {
    return;
  }

  void navigator.clipboard
    .read()
    .then(async (items) => {
      const imageItem = items.find((item) =>
        item.types.some((type) => type.startsWith("image/")),
      );
      if (!imageItem) {
        return;
      }
      const imageType =
        imageItem.types.find((type) => type.startsWith("image/")) ?? "";
      const blob = await imageItem.getType(imageType);
      onImage(
        new File([blob], "clipboard-image", {
          type: blob.type || imageType,
        }),
      );
    })
    .catch((error) => {
      console.warn("Clipboard read failed", error);
    });
};

export const ClipboardImageButton = ({
  label,
  onImage,
  disabled,
  className,
  showUploadIcon,
}: ClipboardImageButtonProps) => (
  <button
    className={
      className ??
      "inline-flex w-full items-center justify-center rounded-md border border-muted-foreground/30 bg-white px-3 py-2 font-medium text-foreground text-xs shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    }
    disabled={disabled}
    onClick={(event) => readClipboardImage(event, onImage)}
    onPaste={(event) => {
      const file = extractClipboardImage(event);
      if (!file) {
        return;
      }
      event.preventDefault();
      onImage(file);
    }}
    type="button"
  >
    {showUploadIcon && <UploadIcon className="size-4" />}
    {label}
  </button>
);
