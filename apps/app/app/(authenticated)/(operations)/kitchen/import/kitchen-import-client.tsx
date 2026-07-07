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
  CalendarIcon,
  CheckCircle2Icon,
  ChefHatIcon,
  FileIcon,
  FileTextIcon,
  LeafIcon,
  LinkIcon,
  Loader2Icon,
  UploadIcon,
  UtensilsCrossedIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { apiFetch } from "@/app/lib/api";

type ImportType =
  | "recipes"
  | "dishes"
  | "prep-lists"
  | "ingredients"
  | "recipe-ingredients"
  | "events";

interface ImportSummary {
  created: string[];
  errors: string[];
  imported: number;
  skipped: number;
}

interface TabConfig {
  csvColumns: string;
  description: string;
  formatNote?: string;
  icon: typeof ChefHatIcon;
  id: ImportType;
  label: string;
}

const RECIPE_SHEET_EXAMPLE = `section,key,value
recipe_info,recipe_name,POMODORO SAUCE
recipe_info,yield_total,10 GALLONS
recipe_info,portion_size,SEE PREP BOARD
recipe_info,servings,SEE PREP BOARD
recipe_info,active_prep_time,20 MINUTES
recipe_info,passive_cook_time,1 HOUR
recipe_info,total_time,1 HOUR 20 MINUTES
recipe_info,version,2026.01
allergen,dairy,
allergen,wheat_gluten,x
equipment,,TILT SKILLET
equipment,,IMMERSION BLENDER
ingredient,DICED ONION,5 POUNDS
ingredient,DICED CELERY,2.5 POUNDS
instruction,1,IN TILT SKILLET HEAT 1/2 CUPS OF OLIVE OIL UNTIL HOT
instruction,2,ADD ONIONS CELERY AND CARROTS AND COOK UNTIL CARROTS ARE SOFT
packaging,drop_off,ONCE COOLED COMPLETELY PACKAGE IN PROPER SIZED BAIN MARIE CATER WRAP AND LABEL FOR EVENT`;

const TABS: TabConfig[] = [
  {
    id: "recipes",
    label: "Recipe Sheets",
    description:
      "Import full kitchen recipe sheets (info, allergens, equipment, ingredients, method, packaging). One CSV file per recipe, or multiple recipes separated by recipe_start rows.",
    icon: ChefHatIcon,
    csvColumns: "section, key, value",
    formatNote: RECIPE_SHEET_EXAMPLE,
  },
  {
    id: "ingredients",
    label: "Ingredients",
    description: "Import standalone ingredient catalog entries",
    icon: LeafIcon,
    csvColumns:
      "name, category, default_unit, shelf_life_days, storage_instructions, allergens",
  },
  {
    id: "recipe-ingredients",
    label: "Recipe Lines",
    description: "Link ingredients to existing recipes (import ingredients and recipes first)",
    icon: LinkIcon,
    csvColumns:
      "recipe_name, ingredient_name, quantity, unit, sort_order, preparation_notes, is_optional",
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
    id: "events",
    label: "Events",
    description: "Import event headers (title, date, guest count, venue)",
    icon: CalendarIcon,
    csvColumns:
      "title, event_date, event_type, guest_count, venue_name, venue_address, status, notes, tags",
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

const RECIPE_UPLOAD_EXTENSIONS = [
  ".csv",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
];

export function KitchenImportClient() {
  const [activeTab, setActiveTab] = useState<ImportType>("recipes");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const allowedExtensions =
    activeTab === "recipes" ? RECIPE_UPLOAD_EXTENSIONS : [".csv"];

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) {
        return;
      }

      const newFiles: File[] = [];

      for (const file of Array.from(fileList)) {
        const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (allowedExtensions.includes(ext)) {
          newFiles.push(file);
        }
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setError(null);
      setResult(null);
    },
    [allowedExtensions]
  );

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      setError(
        activeTab === "recipes"
          ? "Please select at least one CSV, PDF, or image file to import."
          : "Please select at least one CSV file to import."
      );
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <Card tone="canvas">
        <CardHeader>
          <CardTitle>Bulk Import</CardTitle>
          <CardDescription>
            Upload CSV files to seed ingredients, recipes, dishes, events, and
            prep lists. Recipe sheets also accept PDF or scanned images — OCR
            uses Gemini Flash by default (free tier; set{" "}
            <code className="rounded bg-muted px-1">GOOGLE_GENERATIVE_AI_API_KEY</code>
            ). For event prep-list PDFs with menu parsing, use{" "}
            <Link className="underline" href="/events/import">
              Event Document Import
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs
        onValueChange={(v) => {
          setActiveTab(v as ImportType);
          setFiles([]);
          setResult(null);
          setError(null);
        }}
        value={activeTab}
      >
        <TabsList className="flex h-auto flex-wrap">
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
            <Card tone="canvas">
              <CardHeader>
                <CardTitle>Import {tab.label}</CardTitle>
                <CardDescription>
                  {tab.description}. Upload one or more files — all rows or
                  documents will be processed in a single batch.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
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
                      {tab.id === "recipes"
                        ? "Drag and drop CSV, PDF, image, or text files here, or click to browse"
                        : "Drag and drop CSV files here, or click to browse"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {tab.id === "recipes"
                        ? "Supports .csv, .pdf, .png, .jpg, .jpeg, .webp, .txt"
                        : "Supports .csv files"}
                    </p>
                    <input
                      accept={
                        tab.id === "recipes"
                          ? ".csv,.pdf,.png,.jpg,.jpeg,.webp,.txt"
                          : ".csv"
                      }
                      className="mt-4 max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:font-medium file:text-sm"
                      multiple
                      onChange={(e) => handleFiles(e.target.files)}
                      type="file"
                    />
                  </div>

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
                                  {formatBytes(file.size)} •{" "}
                                  {file.name.split(".").pop()?.toUpperCase()}
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

                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-2 font-medium text-muted-foreground text-xs">
                      {tab.id === "recipes"
                        ? "Recipe sheet CSV format (matches kitchen recipe template):"
                        : "Expected CSV columns:"}
                    </p>
                    {tab.formatNote ? (
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-background p-3 text-muted-foreground text-xs">
                        {tab.formatNote}
                      </pre>
                    ) : (
                      <code className="break-all text-muted-foreground text-xs">
                        {tab.csvColumns}
                      </code>
                    )}
                    {tab.id === "recipes" && (
                      <p className="mt-3 text-muted-foreground text-xs">
                        Sections: <strong>recipe_info</strong>,{" "}
                        <strong>allergen</strong> (mark checked with x),{" "}
                        <strong>equipment</strong>, <strong>ingredient</strong>,{" "}
                        <strong>instruction</strong>, <strong>packaging</strong>{" "}
                        (drop_off, bring_hot, cook_on_site). Multiple recipes in
                        one file: add{" "}
                        <code>recipe_start,,Recipe Name</code> between sheets.
                        PDFs and photos are parsed with Gemini OCR when a{" "}
                        <code>GOOGLE_GENERATIVE_AI_API_KEY</code> is configured.
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive">
                      <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

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
