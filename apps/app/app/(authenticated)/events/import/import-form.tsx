"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileIcon,
  Loader2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface ParsedDocument {
  id: string;
  fileName: string;
  fileType: "pdf" | "csv";
  detectedFormat: string;
  confidence: number;
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  documents: ParsedDocument[];
  mergedEvent?: {
    client?: string;
    number?: string;
    date?: string;
    headCount?: number;
    [key: string]: unknown;
  };
  mergedStaff?: Array<{
    name: string;
    position?: string;
    scheduledIn?: string;
    scheduledOut?: string;
  }>;
  imports: Array<{
    importId: string;
    document: ParsedDocument;
  }>;
  checklist?: {
    autoFilledCount: number;
    totalQuestions: number;
    warnings: string[];
  };
  checklistId?: string;
  battleBoard?: {
    autoFillScore: number;
    warnings: string[];
  };
  battleBoardId?: string;
  errors: string[];
}

export function ImportForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [generateBattleBoard, setGenerateBattleBoard] = useState(true);
  const [generateChecklist, setGenerateChecklist] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: File[] = [];
    const allowedTypes = [
      "application/pdf",
      "text/csv",
      "application/vnd.ms-excel",
    ];
    const allowedExtensions = [".pdf", ".csv"];

    for (const file of Array.from(fileList)) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (allowedTypes.includes(file.type) || allowedExtensions.includes(ext)) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      setError("Please select at least one file to import.");
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

      const params = new URLSearchParams();
      if (generateChecklist) params.append("generateChecklist", "true");
      if (generateBattleBoard) params.append("generateBattleBoard", "true");

      const response = await fetch(
        `/api/events/documents/parse?${params.toString()}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Import failed: ${response.statusText}`
        );
      }

      const data = await response.json();
      setResult(data.data as ImportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Upload event PDFs (TPP format) and/or staff roster CSVs. Multiple
            files will be merged into a single event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Drop Zone */}
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <UploadIcon className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF and CSV files
              </p>
              <Input
                accept=".csv,.pdf"
                className="mt-4 max-w-xs"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                type="file"
              />
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Selected Files ({files.length})</Label>
                <div className="rounded-lg border">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between border-b p-3 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(file.size)} •{" "}
                            {file.name.endsWith(".pdf") ? "PDF" : "CSV"}
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

            {/* Options */}
            <div className="flex flex-col gap-4">
              <Label>Generation Options</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={generateBattleBoard}
                    id="generateBattleBoard"
                    onCheckedChange={(checked) =>
                      setGenerateBattleBoard(checked === true)
                    }
                  />
                  <label
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor="generateBattleBoard"
                  >
                    Generate Battle Board
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={generateChecklist}
                    id="generateChecklist"
                    onCheckedChange={(checked) =>
                      setGenerateChecklist(checked === true)
                    }
                  />
                  <label
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor="generateChecklist"
                  >
                    Generate Pre-Event Review Checklist
                  </label>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive">
                <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button disabled={files.length === 0 || isLoading} type="submit">
              {isLoading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Import {files.length > 0 ? `${files.length} File(s)` : "Files"}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2Icon className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
            <CardDescription>
              Processed {result.documents.length} file(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Document Results */}
            <div className="flex flex-col gap-3">
              <Label>Processed Documents</Label>
              <div className="rounded-lg border">
                {result.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 border-b p-4 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4" />
                        <span className="font-medium">{doc.fileName}</span>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">
                        {doc.detectedFormat} ({doc.confidence}% confidence)
                      </span>
                    </div>
                    {doc.errors.length > 0 && (
                      <div className="text-sm text-destructive">
                        Errors: {doc.errors.join(", ")}
                      </div>
                    )}
                    {doc.warnings.length > 0 && (
                      <div className="text-sm text-amber-600">
                        Warnings: {doc.warnings.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Merged Event Data */}
            {result.mergedEvent && (
              <div className="flex flex-col gap-3">
                <Label>Extracted Event Data</Label>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    {result.mergedEvent.client && (
                      <>
                        <dt className="text-muted-foreground">Client</dt>
                        <dd className="font-medium">
                          {result.mergedEvent.client}
                        </dd>
                      </>
                    )}
                    {result.mergedEvent.number && (
                      <>
                        <dt className="text-muted-foreground">Event #</dt>
                        <dd className="font-medium">
                          {result.mergedEvent.number}
                        </dd>
                      </>
                    )}
                    {result.mergedEvent.date && (
                      <>
                        <dt className="text-muted-foreground">Date</dt>
                        <dd className="font-medium">{result.mergedEvent.date}</dd>
                      </>
                    )}
                    {result.mergedEvent.headCount && (
                      <>
                        <dt className="text-muted-foreground">Head Count</dt>
                        <dd className="font-medium">
                          {result.mergedEvent.headCount}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
            )}

            {/* Staff Data */}
            {result.mergedStaff && result.mergedStaff.length > 0 && (
              <div className="flex flex-col gap-3">
                <Label>Staff Roster ({result.mergedStaff.length} people)</Label>
                <div className="max-h-48 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="p-2 text-left font-medium">Name</th>
                        <th className="p-2 text-left font-medium">Position</th>
                        <th className="p-2 text-left font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.mergedStaff.map((staff, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{staff.name}</td>
                          <td className="p-2">{staff.position || "—"}</td>
                          <td className="p-2">
                            {staff.scheduledIn && staff.scheduledOut
                              ? `${staff.scheduledIn} - ${staff.scheduledOut}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Generation Status */}
            <div className="flex flex-col gap-3">
              <Label>Generated Artifacts</Label>
              <div className="flex flex-wrap gap-4">
                {generateBattleBoard && (
                  <div
                    className={`flex flex-col gap-1 rounded-lg border p-3 ${
                      result.battleBoardId
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : "border-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.battleBoardId ? (
                        <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">
                        Battle Board{" "}
                        {result.battleBoardId ? "Created" : "Not Created"}
                      </span>
                    </div>
                    {result.battleBoard && (
                      <span className="text-xs text-muted-foreground">
                        Auto-fill score: {result.battleBoard.autoFillScore}%
                      </span>
                    )}
                  </div>
                )}
                {generateChecklist && (
                  <div
                    className={`flex flex-col gap-1 rounded-lg border p-3 ${
                      result.checklistId
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : "border-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.checklistId ? (
                        <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">
                        Checklist{" "}
                        {result.checklistId ? "Created" : "Not Created"}
                      </span>
                    </div>
                    {result.checklist && (
                      <span className="text-xs text-muted-foreground">
                        Auto-filled: {result.checklist.autoFilledCount} /{" "}
                        {result.checklist.totalQuestions} questions
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-wrap gap-3">
              {result.battleBoardId && (
                <Button
                  onClick={() =>
                    router.push(`/events/battle-boards/${result.battleBoardId}`)
                  }
                >
                  View Battle Board
                </Button>
              )}
              {result.checklistId && (
                <Button
                  onClick={() =>
                    router.push(`/events/reports/${result.checklistId}`)
                  }
                  variant={result.battleBoardId ? "secondary" : "default"}
                >
                  View Checklist
                </Button>
              )}
              <Button
                onClick={() => router.push("/events/battle-boards")}
                variant="outline"
              >
                All Battle Boards
              </Button>
              <Button
                onClick={() => router.push("/events/reports")}
                variant="outline"
              >
                All Reports
              </Button>
              <Button
                onClick={() => {
                  setFiles([]);
                  setResult(null);
                }}
                variant="ghost"
              >
                Import More Files
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
