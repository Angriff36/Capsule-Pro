"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { UploadIcon } from "lucide-react";
import { useId, useRef } from "react";

const ACCEPT = ".csv,.pdf,.png,.jpg,.jpeg,.webp,.txt";

interface SmartImportDropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export function SmartImportDropZone({ onFilesSelected }: SmartImportDropZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const ingestFileList = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const allowed = [".csv", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt"];
    const accepted = Array.from(fileList).filter((file) => {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      return allowed.includes(ext);
    });

    if (accepted.length > 0) {
      onFilesSelected(accepted);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 transition-colors hover:border-primary/50 hover:bg-primary/5"
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        ingestFileList(event.dataTransfer.files);
      }}
    >
      <UploadIcon className="mb-4 h-10 w-10 text-primary" />
      <p className="mb-1 font-medium text-sm">Drop files here</p>
      <p className="mb-4 text-center text-muted-foreground text-xs">
        CSV, PDF, PNG, JPG, WEBP — recipes, events, ingredients, prep lists
      </p>

      <input
        accept={ACCEPT}
        className="sr-only"
        id={inputId}
        multiple
        onChange={(event) => {
          ingestFileList(event.target.files);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />

      <Button
        onClick={() => inputRef.current?.click()}
        size="lg"
        type="button"
        variant="default"
      >
        <UploadIcon className="mr-2 h-4 w-4" />
        Choose files
      </Button>
    </div>
  );
}
