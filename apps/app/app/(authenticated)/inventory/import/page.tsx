"use client";

import { apiFetch } from "@/app/lib/api";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string }>;
}

const CSV_TEMPLATE = `item_number,name,category,unit_cost,quantity_on_hand,reorder_level,tags,fsa_status
"ITM-001","Organic Whole Milk","dairy",4.99,50,10,"organic,fresh",compliant
"ITM-002","Chicken Breast","meat",8.50,30,15,"",requires_review
"ITM-003","Romaine Lettuce","produce",2.49,100,25,"organic,gluten-free",compliant`;

const CSV_HEADERS = [
  "item_number",
  "name",
  "category",
  "unit_cost",
  "quantity_on_hand",
  "reorder_level",
  "tags",
  "fsa_status",
];

export default function InventoryImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setResult({
        success: 0,
        errors: [{ row: 0, message: "Please upload a CSV file" }],
      });
      return;
    }
    setFile(selectedFile);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch("/api/inventory/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Import failed" }));
        setResult({
          success: 0,
          errors: [
            { row: 0, message: errorData.error || `HTTP ${res.status}` },
          ],
        });
        return;
      }

      const data: ImportResult = await res.json();
      setResult(data);
      if (data.success > 0) setFile(null);
    } catch (err) {
      setResult({
        success: 0,
        errors: [
          {
            row: 0,
            message: err instanceof Error ? err.message : "Upload failed",
          },
        ],
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Import Inventory
            </h1>
            <p className="text-muted-foreground">
              Bulk import inventory items from a CSV file
            </p>
          </div>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>
              Drag and drop your CSV file or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".csv";
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files?.[0]) handleFileSelect(target.files[0]);
                };
                input.click();
              }}
              onDragLeave={() => setDragOver(false)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="text-center">
                  <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    Drop CSV file here or click to browse
                  </p>
                </div>
              )}
            </div>

            <Button
              className="mt-4 w-full"
              disabled={!file || importing}
              onClick={handleImport}
            >
              {importing ? "Importing..." : "Import Items"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSV Format</CardTitle>
            <CardDescription>
              Required columns and accepted values
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-medium text-sm">Required Columns</h4>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                    item_number *
                  </span>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                    name *
                  </span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-sm">Optional Columns</h4>
                <div className="flex flex-wrap gap-1.5">
                  {CSV_HEADERS.filter(
                    (h) => h !== "item_number" && h !== "name"
                  ).map((header) => (
                    <span
                      className="rounded bg-muted px-2 py-0.5 text-xs font-medium"
                      key={header}
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-sm">Category Values</h4>
                <div className="flex flex-wrap gap-1">
                  {[
                    "dairy",
                    "meat",
                    "poultry",
                    "seafood",
                    "produce",
                    "dry_goods",
                    "frozen",
                    "beverages",
                    "supplies",
                    "equipment",
                    "other",
                  ].map((cat) => (
                    <span
                      className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                      key={cat}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-sm">FSA Status Values</h4>
                <div className="flex flex-wrap gap-1">
                  {[
                    "unknown",
                    "requires_review",
                    "compliant",
                    "non_compliant",
                    "exempt",
                  ].map((status) => (
                    <span
                      className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-400"
                      key={status}
                    >
                      {status.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card
          className={
            result.success > 0 && result.errors.length === 0
              ? "border-green-200 dark:border-green-900"
              : ""
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {result.success}
                  </p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                {result.errors.length > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {result.errors.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-60 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Row</th>
                        <th className="px-3 py-2 text-left font-medium">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr className="border-t" key={i}>
                          <td className="px-3 py-2 font-mono text-xs">
                            {err.row}
                          </td>
                          <td className="px-3 py-2 text-red-600">
                            {err.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
