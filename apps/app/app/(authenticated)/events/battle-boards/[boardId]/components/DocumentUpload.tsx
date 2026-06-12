import { AlertTriangle, CheckCircle, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { processDocument } from "@/lib/battle-boards/parsers";
import type {
  BattleBoardFull,
  ParsedDocumentResult,
} from "@/lib/battle-boards/types";
import { recordImportAction } from "../../actions";

interface DocumentUploadProps {
  board: BattleBoardFull;
  onClose: () => void;
  onImport: (board: BattleBoardFull) => void;
}

export function DocumentUpload({
  board,
  onImport,
  onClose,
}: DocumentUploadProps) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ParsedDocumentResult | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setProcessing(true);
    setResult(null);

    try {
      const parsed = await processDocument(file);
      setResult(parsed);

      if (parsed.success) {
        await recordImportAction(board.id, {
          file_name: file.name,
          file_type: file.name.split(".").pop() || "",
          format_detected: parsed.format,
          confidence: parsed.confidence,
          warnings: parsed.warnings,
        });
      }
    } catch (err) {
      setResult({
        success: false,
        format: "generic",
        confidence: "low",
        data: { meta: {}, staff: [], timeline: [], layouts: [] },
        warnings: [],
        error: err instanceof Error ? err.message : "Processing failed",
      });
    } finally {
      setProcessing(false);
    }
  }

  function applyImport() {
    if (!result?.success) {
      return;
    }

    const { meta, staff, timeline, layouts } = result.data;

    const merged: BattleBoardFull = {
      ...board,
      event_name: meta.event_name || board.event_name,
      event_number: meta.event_number || board.event_number,
      event_date: meta.event_date || board.event_date,
      venue_name: meta.venue_name || board.venue_name,
      venue_address: meta.venue_address || board.venue_address,
      headcount: meta.headcount || board.headcount,
      service_style: meta.service_style || board.service_style,
      staff_parking: meta.staff_parking || board.staff_parking,
      staff_restrooms: meta.staff_restrooms || board.staff_restrooms,
      staff:
        staff.length > 0
          ? mergeStaff(
              board.staff,
              staff.map((s) => ({
                ...s,
                id: crypto.randomUUID(),
                board_id: board.id,
                tenant_id: board.tenant_id,
              }))
            )
          : board.staff,
      timeline:
        timeline.length > 0
          ? mergeTimeline(
              board.timeline,
              timeline.map((t) => ({
                ...t,
                id: crypto.randomUUID(),
                board_id: board.id,
                tenant_id: board.tenant_id,
              }))
            )
          : board.timeline,
      layouts:
        layouts.length > 0
          ? [
              ...board.layouts,
              ...layouts.map((l) => ({
                ...l,
                id: crypto.randomUUID(),
                board_id: board.id,
                tenant_id: board.tenant_id,
              })),
            ]
          : board.layouts,
    };

    onImport(merged);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }

  const formatLabels: Record<string, string> = {
    tpp: "TPP Event Worksheet",
    csv: "Staff CSV",
    generic: "Generic PDF",
  };

  const confidenceColors: Record<string, string> = {
    high: "text-emerald-700 bg-emerald-50",
    medium: "text-amber-700 bg-amber-50",
    low: "text-red-700 bg-red-50",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-slate-200 border-b p-5">
          <h2 className="font-semibold text-base text-slate-900">
            Import Document
          </h2>
          <button
            className="rounded-lg p-2 text-slate-400 transition-colors hover:text-slate-600"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div
            className="cursor-pointer rounded-xl border-2 border-slate-200 border-dashed p-8 text-center transition-all hover:border-slate-400 hover:bg-slate-50"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="font-medium text-slate-700 text-sm">
              Drop a file here or click to browse
            </p>
            <p className="mt-1 text-slate-500 text-xs">
              Supports PDF (TPP worksheets, generic) and CSV (staff schedules)
            </p>
            <input
              accept=".pdf,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFile(file);
                }
              }}
              ref={fileRef}
              type="file"
            />
          </div>

          {processing && (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
              <div>
                <p className="font-medium text-slate-700 text-sm">
                  Processing {fileName}...
                </p>
                <p className="text-slate-500 text-xs">
                  Detecting format and extracting data
                </p>
              </div>
            </div>
          )}

          {result && !processing && (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-800 text-sm">
                        Document processed successfully
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 text-xs">
                          {formatLabels[result.format]}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium text-xs ${confidenceColors[result.confidence]}`}
                        >
                          {result.confidence} confidence
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                      Extracted Data
                    </h3>
                    <div className="space-y-2 text-sm">
                      {result.data.meta.event_name && (
                        <DataRow
                          label="Event"
                          value={result.data.meta.event_name}
                        />
                      )}
                      {result.data.meta.event_number && (
                        <DataRow
                          label="Number"
                          value={`#${result.data.meta.event_number}`}
                        />
                      )}
                      {result.data.meta.event_date && (
                        <DataRow
                          label="Date"
                          value={result.data.meta.event_date}
                        />
                      )}
                      {result.data.staff.length > 0 && (
                        <DataRow
                          label="Staff"
                          value={`${result.data.staff.length} team members`}
                        />
                      )}
                      {result.data.timeline.length > 0 && (
                        <DataRow
                          label="Timeline"
                          value={`${result.data.timeline.length} entries`}
                        />
                      )}
                    </div>
                  </div>

                  {result.warnings.length > 0 && (
                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
                      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800 text-sm">
                          Warnings
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {result.warnings.map((w, i) => (
                            <li className="text-amber-700 text-xs" key={i}>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <button
                    className="w-full rounded-lg bg-slate-900 py-2.5 font-medium text-sm text-white transition-colors hover:bg-slate-800"
                    onClick={applyImport}
                  >
                    Apply to Battle Board
                  </button>
                </>
              ) : (
                <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800 text-sm">
                      Failed to process document
                    </p>
                    <p className="mt-1 text-red-600 text-xs">{result.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function mergeStaff(
  existing: BattleBoardFull["staff"],
  incoming: BattleBoardFull["staff"]
): BattleBoardFull["staff"] {
  if (existing.length === 0) {
    return incoming;
  }

  const merged = [...existing];
  for (const member of incoming) {
    const existingIdx = merged.findIndex(
      (m) => m.name.toLowerCase() === member.name.toLowerCase()
    );
    if (existingIdx >= 0) {
      merged[existingIdx] = {
        ...member,
        station: merged[existingIdx].station || member.station,
      };
    } else {
      merged.push(member);
    }
  }
  return merged.map((s, i) => ({ ...s, sort_order: i }));
}

function mergeTimeline(
  existing: BattleBoardFull["timeline"],
  incoming: BattleBoardFull["timeline"]
): BattleBoardFull["timeline"] {
  if (existing.length === 0) {
    return incoming;
  }

  const merged = [...existing];
  for (const entry of incoming) {
    const isDuplicate = merged.some(
      (e) => e.time === entry.time && e.item === entry.item
    );
    if (!isDuplicate) {
      merged.push(entry);
    }
  }
  return merged.map((t, i) => ({ ...t, sort_order: i }));
}
