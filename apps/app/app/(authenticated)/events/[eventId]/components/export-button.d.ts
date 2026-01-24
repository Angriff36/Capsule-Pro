import { type ExportFormat } from "../../../../lib/use-event-export";
interface EventExportButtonProps {
  eventId: string;
  eventName?: string;
}
/**
 * Export button with dropdown menu for different export options
 *
 * Provides:
 * - Quick export options (PDF Full, PDF Summary)
 * - Format-specific options (CSV, PDF)
 * - Section selection for granular exports
 */
export declare function EventExportButton({
  eventId,
  eventName,
}: EventExportButtonProps): import("react").JSX.Element;
/**
 * Simple export button that triggers a default export
 */
export declare function EventExportButtonSimple({
  eventId,
  format,
}: {
  eventId: string;
  format?: ExportFormat;
}): import("react").JSX.Element;
//# sourceMappingURL=export-button.d.ts.map
