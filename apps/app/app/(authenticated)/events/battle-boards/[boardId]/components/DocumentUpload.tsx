import { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import type { BattleBoardFull, ParsedDocumentResult } from '@/lib/battle-boards/types';
import { processDocument } from '@/lib/battle-boards/parsers';
import { recordImportAction } from '../../actions';

interface DocumentUploadProps {
  board: BattleBoardFull;
  onImport: (board: BattleBoardFull) => void;
  onClose: () => void;
}

export function DocumentUpload({ board, onImport, onClose }: DocumentUploadProps) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ParsedDocumentResult | null>(null);
  const [fileName, setFileName] = useState('');
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
          file_type: file.name.split('.').pop() || '',
          format_detected: parsed.format,
          confidence: parsed.confidence,
          warnings: parsed.warnings,
        });
      }
    } catch (err) {
      setResult({
        success: false,
        format: 'generic',
        confidence: 'low',
        data: { meta: {}, staff: [], timeline: [], layouts: [] },
        warnings: [],
        error: err instanceof Error ? err.message : 'Processing failed',
      });
    } finally {
      setProcessing(false);
    }
  }

  function applyImport() {
    if (!result?.success) return;

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
      staff: staff.length > 0
        ? mergeStaff(board.staff, staff.map((s) => ({
            ...s,
            id: crypto.randomUUID(),
            board_id: board.id,
            tenant_id: board.tenant_id,
          })))
        : board.staff,
      timeline: timeline.length > 0
        ? mergeTimeline(board.timeline, timeline.map((t) => ({
            ...t,
            id: crypto.randomUUID(),
            board_id: board.id,
            tenant_id: board.tenant_id,
          })))
        : board.timeline,
      layouts: layouts.length > 0
        ? [...board.layouts, ...layouts.map((l) => ({
            ...l,
            id: crypto.randomUUID(),
            board_id: board.id,
            tenant_id: board.tenant_id,
          }))]
        : board.layouts,
    };

    onImport(merged);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const formatLabels: Record<string, string> = {
    tpp: 'TPP Event Worksheet',
    csv: 'Staff CSV',
    generic: 'Generic PDF',
  };

  const confidenceColors: Record<string, string> = {
    high: 'text-emerald-700 bg-emerald-50',
    medium: 'text-amber-700 bg-amber-50',
    low: 'text-red-700 bg-red-50',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Import Document</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">Drop a file here or click to browse</p>
            <p className="text-xs text-slate-500 mt-1">Supports PDF (TPP worksheets, generic) and CSV (staff schedules)</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {processing && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-slate-700">Processing {fileName}...</p>
                <p className="text-xs text-slate-500">Detecting format and extracting data</p>
              </div>
            </div>
          )}

          {result && !processing && (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Document processed successfully</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-2 py-0.5 text-xs font-medium bg-white text-slate-700 rounded-full border border-slate-200">
                          {formatLabels[result.format]}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${confidenceColors[result.confidence]}`}>
                          {result.confidence} confidence
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Extracted Data</h3>
                    <div className="space-y-2 text-sm">
                      {result.data.meta.event_name && (
                        <DataRow label="Event" value={result.data.meta.event_name} />
                      )}
                      {result.data.meta.event_number && (
                        <DataRow label="Number" value={`#${result.data.meta.event_number}`} />
                      )}
                      {result.data.meta.event_date && (
                        <DataRow label="Date" value={result.data.meta.event_date} />
                      )}
                      {result.data.staff.length > 0 && (
                        <DataRow label="Staff" value={`${result.data.staff.length} team members`} />
                      )}
                      {result.data.timeline.length > 0 && (
                        <DataRow label="Timeline" value={`${result.data.timeline.length} entries`} />
                      )}
                    </div>
                  </div>

                  {result.warnings.length > 0 && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Warnings</p>
                        <ul className="mt-1 space-y-0.5">
                          {result.warnings.map((w, i) => (
                            <li key={i} className="text-xs text-amber-700">{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={applyImport}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    Apply to Battle Board
                  </button>
                </>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Failed to process document</p>
                    <p className="text-xs text-red-600 mt-1">{result.error}</p>
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
  existing: BattleBoardFull['staff'],
  incoming: BattleBoardFull['staff']
): BattleBoardFull['staff'] {
  if (existing.length === 0) return incoming;

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
  existing: BattleBoardFull['timeline'],
  incoming: BattleBoardFull['timeline']
): BattleBoardFull['timeline'] {
  if (existing.length === 0) return incoming;

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
