"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Label } from "@repo/design-system/components/ui/label";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { smartImportRoute } from "@/app/lib/routes";
import { SmartImportDropZone } from "./smart-import-drop-zone";

interface SmartDetection {
  confidence: number;
  fileName: string;
  kind: string;
  label: string;
  reason: string;
}

interface KitchenImportSummary {
  created: string[];
  errors: string[];
  imported: number;
  skipped: number;
}

interface SmartImportResult {
  detections: SmartDetection[];
  event?: Record<string, unknown> | null;
  kitchen?: KitchenImportSummary | null;
}

interface SmartImportDialogProps {
  files: File[];
  onClear: () => void;
  onClose: () => void;
  open: boolean;
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 Bytes";
  }
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function SmartImportDialog({
  open,
  onClose,
  files,
  onClear,
}: SmartImportDialogProps) {
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SmartImportResult | null>(null);

  useEffect(() => {
    if (open) {
      setLocalFiles(files);
      setError(null);
      setResult(null);
    }
  }, [open, files]);

  const addFiles = useCallback((incoming: File[]) => {
    setLocalFiles((prev) => {
      const seen = new Set(prev.map((file) => `${file.name}:${file.size}`));
      const merged = [...prev];
      for (const file of incoming) {
        const key = `${file.name}:${file.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      }
      return merged;
    });
    setError(null);
    setResult(null);
  }, []);

  const removeFile = useCallback((index: number) => {
    setLocalFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleImport = async () => {
    if (localFiles.length === 0) {
      setError("Choose at least one file to import.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      for (const file of localFiles) {
        formData.append("files", file);
      }

      const response = await apiFetch(smartImportRoute(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ??
            errorData.details ??
            `Import failed (${response.status})`
        );
      }

      const payload = await response.json();
      setResult(payload.data as SmartImportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setLocalFiles([]);
    setError(null);
    setResult(null);
    onClear();
    onClose();
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
      open={open}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Smart Import</DialogTitle>
          <DialogDescription>
            Upload anything — we detect recipe sheets, event PDFs, ingredients,
            prep lists, and more.
          </DialogDescription>
        </DialogHeader>

        <SmartImportDropZone onFilesSelected={addFiles} />

        {localFiles.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>Selected files ({localFiles.length})</Label>
            <div className="max-h-48 overflow-y-auto rounded-lg border">
              {localFiles.map((file, index) => (
                <div
                  className="flex items-center justify-between border-b p-3 last:border-b-0"
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{file.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeFile(index)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive text-sm">
            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 font-medium text-sm">
              <CheckCircle2Icon className="h-4 w-4 text-green-600" />
              Import finished
            </div>
            <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
              {result.detections.map((detection) => (
                <div
                  className="rounded-md border bg-background p-2 text-sm"
                  key={`${detection.fileName}-${detection.kind}`}
                >
                  <p className="font-medium">{detection.fileName}</p>
                  <p className="text-muted-foreground text-xs">
                    {detection.label} · {detection.confidence}%
                  </p>
                </div>
              ))}
            </div>
            {result.kitchen && (
              <p className="text-sm">
                Kitchen: {result.kitchen.imported} imported,{" "}
                {result.kitchen.skipped} skipped
                {result.kitchen.errors.length > 0 &&
                  `, ${result.kitchen.errors.length} errors`}
              </p>
            )}
            {result.event && <p className="text-sm">Event import completed.</p>}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={handleClose} type="button" variant="outline">
            Close
          </Button>
          <Button disabled={localFiles.length === 0 || isLoading} onClick={handleImport} type="button">
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import${localFiles.length > 0 ? ` (${localFiles.length})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
