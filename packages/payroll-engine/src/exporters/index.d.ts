export * from "./csvExport";
export * from "./qbOnlineCsvExport";
export * from "./qbxmlExport";
import type { ExportFormatType, PayrollPeriod, PayrollRecord } from "../models";
import { type CsvExportOptions } from "./csvExport";
import { type QBOnlineCsvExportOptions } from "./qbOnlineCsvExport";
import { type QBXMLExportOptions } from "./qbxmlExport";
/**
 * Unified export options
 */
export interface ExportOptions {
  format: ExportFormatType;
  aggregate?: boolean;
  csv?: CsvExportOptions;
  qbxml?: QBXMLExportOptions;
  qbOnlineCsv?: QBOnlineCsvExportOptions;
}
/**
 * Export result
 */
export interface ExportResult {
  format: ExportFormatType;
  content: string;
  filename: string;
  mimeType: string;
}
/**
 * Universal export function
 * Exports payroll records to the specified format
 */
export declare function exportPayroll(
  records: PayrollRecord[],
  period: PayrollPeriod,
  options: ExportOptions
): ExportResult;
//# sourceMappingURL=index.d.ts.map
