// Payroll Export Modules
// Provides export functionality for CSV, QBXML, and QuickBooks Online formats

export * from "./csvExport";
export * from "./qbOnlineCsvExport";
export * from "./qbxmlExport";

import type { ExportFormatType, PayrollPeriod, PayrollRecord } from "../models";
import { type CsvExportOptions, exportToCSV } from "./csvExport";
import {
  exportToQBOnlineCSV,
  exportToQBOnlineCSVAggregate,
  type QBOnlineCsvExportOptions,
} from "./qbOnlineCsvExport";
import {
  exportToQBXML,
  exportToQBXMLAggregate,
  type QBXMLExportOptions,
} from "./qbxmlExport";

/**
 * Unified export options
 */
export interface ExportOptions {
  format: ExportFormatType;
  aggregate?: boolean; // For QB exports, create single aggregate entry
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
 * Generate filename for export
 */
function generateFilename(
  format: ExportFormatType,
  periodId: string,
  aggregate: boolean
): string {
  const periodSlug = periodId.slice(0, 8);
  const suffix = aggregate ? "-aggregate" : "";

  switch (format) {
    case "csv":
      return `payroll-${periodSlug}${suffix}.csv`;
    case "qbxml":
      return `payroll-${periodSlug}${suffix}.qbxml`;
    case "qbOnlineCsv":
      return `payroll-qbo-${periodSlug}${suffix}.csv`;
    case "json":
      return `payroll-${periodSlug}.json`;
    default:
      return `payroll-${periodSlug}.txt`;
  }
}

/**
 * Get MIME type for export format
 */
function getMimeType(format: ExportFormatType): string {
  switch (format) {
    case "csv":
    case "qbOnlineCsv":
      return "text/csv";
    case "qbxml":
      return "application/xml";
    case "json":
      return "application/json";
    default:
      return "text/plain";
  }
}

/**
 * Universal export function
 * Exports payroll records to the specified format
 */
export function exportPayroll(
  records: PayrollRecord[],
  period: PayrollPeriod,
  options: ExportOptions
): ExportResult {
  const { format, aggregate = false } = options;

  let content: string;

  switch (format) {
    case "csv":
      content = exportToCSV(records, period, options.csv);
      break;

    case "qbxml":
      content = aggregate
        ? exportToQBXMLAggregate(records, period, options.qbxml)
        : exportToQBXML(records, period, options.qbxml);
      break;

    case "qbOnlineCsv":
      content = aggregate
        ? exportToQBOnlineCSVAggregate(records, period, options.qbOnlineCsv)
        : exportToQBOnlineCSV(records, period, options.qbOnlineCsv);
      break;

    case "json":
      content = JSON.stringify(
        {
          period: {
            id: period.id,
            startDate: period.startDate.toISOString(),
            endDate: period.endDate.toISOString(),
            status: period.status,
            currency: period.currency,
          },
          records: records.map((r) => ({
            ...r,
            createdAt: r.createdAt?.toISOString(),
          })),
          generatedAt: new Date().toISOString(),
        },
        null,
        2
      );
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  return {
    format,
    content,
    filename: generateFilename(format, period.id, aggregate),
    mimeType: getMimeType(format),
  };
}
