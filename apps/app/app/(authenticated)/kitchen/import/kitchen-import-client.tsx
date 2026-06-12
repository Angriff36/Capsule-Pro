"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChefHatIcon,
  FileIcon,
  FileTextIcon,
  Loader2Icon,
  UploadIcon,
  UtensilsCrossedIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
// NOTE: Keeping apiFetch for file upload (FormData POST) — generated client does not support multipart/form-data
import { apiFetch } from "@/app/lib/api";

// ─── Types ───────────────────────────────────────────────────────────

type ImportType = "recipes" | "dishes" | "prep-lists";

interface ImportSummary {
  created: string[];
  errors: string[];
  imported: number;
  skipped: number;
}

interface TabConfig {
  csvColumns: string;
  description: string;
  icon: typeof ChefHatIcon;
  id: ImportType;
  label: string;
}

const TABS: TabConfig[] = [
  {
    id: "recipes",
    label: "Recipes",
    description: "Import recipe catalog with versions and metadata",
    icon: ChefHatIcon,
    csvColumns:
      "name, category, cuisine_type, description, tags, yield_quantity, prep_time_minutes, cook_time_minutes, instructions, notes",
  },
  {
    id: "dishes",
    label: "Dishes",
    description: "Import dishes linked to existing recipes",
    icon: UtensilsCrossedIcon,
    csvColumns:
      "name, recipe_name, description, category, service_style, portion_size_description, dietary_tags, allergens, price_per_person, cost_per_person",
  },
  {
    id: "prep-lists",
    label: "Prep Lists",
    description: "Import prep lists with items grouped by list name",
    icon: FileTextIcon,
    csvColumns:
      "prep_list_name, item_name, station_name, base_quantity, base_unit, preparation_notes, dish_name, event_number, batch_multiplier, dietary_restrictions",
  },
];

// ─── Component ────────────────────────────────────────────────────────

export function KitchenImportClient() {
  const [activeTab, setActiveTab] = useState<ImportType>("recipes");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // ── File handling ────────────────────────────────────────────────

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) {
      return;
    }

    const newFiles: File[] = [];
    const allowedExtensions = [".csv"];
    // Later: add .png, .jpg, .pdf when Phase 2 image/PDF processing is done

    for (const file of Array.from(fileList)) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (allowedExtensions.includes(ext)) {
        newFiles.push(file);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Submit ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      setError("Please select at least one CSV file to import.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const response = await apiFetch(`/api/kitchen/import?type=${activeTab}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.message ??
          errorData.details ??
          `Import failed: ${response.statusText}`;
        throw new Error(message);
      }

      const data = await response.json();
      setResult(data.data as ImportSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────

  const formatBytes = (bytes: number) => {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        onValueChange={(v) => {
          setActiveTab(v as ImportType);
          setFiles([]);
          setResult(null);
          setError(null);
        }}
        value={activeTab}
      >
        <TabsList>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id}>
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent className="mt-4" key={tab.id} value={tab.id}>
            {/* Upload Card */}
            <Card tone="canvas">
              <CardHeader>
                <CardTitle>Import {tab.label}</CardTitle>
                <CardDescription>
                  {tab.description}. Upload one or more CSV files — all rows
                  will be processed in a single batch.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                  {/* Drop Zone */}
                  <div
                    className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                    }`}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <UploadIcon className="mb-4 h-10 w-10 text-muted-foreground" />
                    <p className="mb-2 text-muted-foreground text-sm">
                      Drag and drop CSV files here, or click to browse
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Supports .csv files (images and PDFs coming soon)
                    </p>
                    <input
                      accept=".csv"
                      className="mt-4 max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:font-medium file:text-sm"
                      multiple
                      onChange={(e) => handleFiles(e.target.files)}
                      type="file"
                    />
                  </div>

                  {/* Selected Files */}
                  {files.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Label>Selected Files ({files.length})</Label>
                      <div className="rounded-lg border">
                        {files.map((file, index) => (
                          <div
                            className="flex items-center justify-between border-b p-3 last:border-b-0"
                            key={`${file.name}-${index}`}
                          >
                            <div className="flex items-center gap-3">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">
                                  {file.name}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {formatBytes(file.size)} • CSV
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

                  {/* CSV Column Reference */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-2 font-medium text-muted-foreground text-xs">
                      Expected CSV columns:
                    </p>
                    <code className="break-all text-muted-foreground text-xs">
                      {tab.csvColumns}
                    </code>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive">
                      <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    disabled={files.length === 0 || isLoading}
                    type="submit"
                  >
                    {isLoading ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        Import{" "}
                        {files.length > 0 ? `${files.length} File(s)` : "Files"}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Results */}
      {result && (
        <Card tone="canvas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2Icon className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
            <CardDescription>
              {result.imported} imported, {result.skipped} skipped
              {result.errors.length > 0 && `, ${result.errors.length} errors`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                <p className="font-bold text-2xl text-green-700">
                  {result.imported}
                </p>
                <p className="text-green-600 text-xs">Imported</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="font-bold text-2xl text-amber-700">
                  {result.skipped}
                </p>
                <p className="text-amber-600 text-xs">Skipped</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                <p className="font-bold text-2xl text-red-700">
                  {result.errors.length}
                </p>
                <p className="text-red-600 text-xs">Errors</p>
              </div>
            </div>

            {/* Created Items */}
            {result.created.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Created ({result.created.length})</Label>
                <div className="max-h-60 overflow-auto rounded-lg border">
                  {result.created.map((item, i) => (
                    <div
                      className="flex items-center gap-2 border-b p-2 px-3 text-sm last:border-b-0"
                      key={i}
                    >
                      <CheckCircle2Icon className="h-4 w-4 flex-shrink-0 text-green-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-destructive">
                  Errors ({result.errors.length})
                </Label>
                <div className="max-h-60 overflow-auto rounded-lg border border-destructive/30">
                  {result.errors.map((err, i) => (
                    <div
                      className="flex items-start gap-2 border-destructive/10 border-b p-2 px-3 text-sm last:border-b-0"
                      key={i}
                    >
                      <AlertCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      <span className="text-destructive">{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
