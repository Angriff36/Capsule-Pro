"use client";

import { useRef, useTransition, type ChangeEvent } from "react";
import { ChefHatIcon, UploadIcon } from "lucide-react";
import { ClipboardImageButton } from "../../components/clipboard-image-button";

type UploadAction = (formData: FormData) => Promise<void>;

type RecipeImagePlaceholderProps = {
  recipeName: string;
  uploadAction: UploadAction;
};

export const RecipeImagePlaceholder = ({
  recipeName,
  uploadAction,
}: RecipeImagePlaceholderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const submitFile = (file: File) => {
    const formData = new FormData();
    formData.set("imageFile", file);
    startTransition(() => {
      void uploadAction(formData);
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    submitFile(file);
    event.target.value = "";
  };

  return (
    <>
      <div className="flex h-full w-full flex-col gap-3 bg-linear-to-br from-slate-200 via-slate-100 to-white p-3 text-muted-foreground">
        <button
          aria-label={`Add image for ${recipeName}`}
          className="flex flex-1 flex-col items-center justify-center gap-2 transition-opacity hover:opacity-90"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <ChefHatIcon size={32} />
          <span className="text-xs">Click to add image</span>
        </button>
        <ClipboardImageButton
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 bg-white/80 px-3 py-3 text-xs font-medium text-foreground transition-colors hover:border-muted-foreground/50 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          disabled={isPending}
          label="Paste from clipboard"
          onImage={submitFile}
          showUploadIcon
        />
      </div>
      <input
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
    </>
  );
};
