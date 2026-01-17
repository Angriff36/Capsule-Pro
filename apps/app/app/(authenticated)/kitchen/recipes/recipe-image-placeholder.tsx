"use client";

import { useRef, useTransition, type ChangeEvent } from "react";
import { ChefHatIcon } from "lucide-react";
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
      <div className="flex h-full w-full flex-col bg-linear-to-br from-slate-200 via-slate-100 to-white text-muted-foreground">
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
        <div className="px-3 pb-3">
          <ClipboardImageButton
            disabled={isPending}
            label="Click to paste image from clipboard"
            onImage={submitFile}
          />
        </div>
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
