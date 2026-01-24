/**
 * Client-side hook for event export functionality
 */
export type ExportFormat = "csv" | "pdf";
export type ExportSection = "summary" | "menu" | "staff" | "guests" | "tasks";
export interface EventExportOptions {
  format: ExportFormat;
  include: ExportSection[];
  download?: boolean;
}
export interface EventExportResult {
  filename: string;
  dataUrl?: string;
  content?: string;
  contentType: string;
}
/**
 * Export an event to CSV or PDF format
 *
 * @param eventId - The event ID to export
 * @param options - Export options (format, sections to include, etc.)
 * @returns Promise with export result containing filename and data
 */
export declare function exportEvent(
  eventId: string,
  options: EventExportOptions
): Promise<EventExportResult>;
/**
 * Download export result as a file
 *
 * @param result - The export result from exportEvent()
 * @param defaultFilename - Fallback filename if not provided in result
 */
export declare function downloadExportResult(
  result: EventExportResult,
  defaultFilename?: string
): void;
/**
 * Hook for event export with loading and error states
 */
export declare function useEventExport(): {
  isExporting: boolean;
  error: string | null;
  result: EventExportResult | null;
  exportEvent: (
    eventId: string,
    options: EventExportOptions
  ) => Promise<EventExportResult | null>;
  downloadResult: (defaultFilename?: string) => void;
};
/**
 * Default export configurations
 */
export declare const exportPresets: Record<string, EventExportOptions>;
//# sourceMappingURL=use-event-export.d.ts.map
