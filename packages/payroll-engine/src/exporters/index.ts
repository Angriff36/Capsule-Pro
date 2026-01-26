// Payroll Export Modules
// Provides export functionality for CSV, QBXML, and QuickBooks Online formats

export {
  exportSummaryToCSV,
  exportToCSV,
  type CsvExportOptions,
} from "./csvExport";
export {
  QBOnlineJournalBuilder,
  exportToQBOnlineCSVAggregate,
  exportToQBOnlineCSV,
  type QBOnlineAccountMappings,
  type QBOnlineCsvExportOptions,
} from "./qbOnlineCsvExport";
export {
  exportToQBXML,
  exportToQBXMLAggregate,
  type QBAccountMappings,
  type QBXMLExportOptions,
} from "./qbxmlExport";

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
 * Factory for export strategies.
 */
export interface PayrollExporter {
  format: ExportFormatType;
  mimeType: string;
  filename: (periodId: string) => string;
  exportContent: (records: PayrollRecord[], period: PayrollPeriod) => string;
}

export function createPayrollExporter(options: ExportOptions): PayrollExporter {
  const { format, aggregate = false } = options;
  const suffix = aggregate ? "-aggregate" : "";
  const periodSlug = (periodId: string) => periodId.slice(0, 8);

  switch (format) {
    case "csv":
      return {
        format,
        mimeType: "text/csv",
        filename: (periodId) => `payroll-${periodSlug(periodId)}${suffix}.csv`,
        exportContent: (records, period) =>
          exportToCSV(records, period, options.csv),
      };

    case "qbxml":
      return {
        format,
        mimeType: "application/xml",
        filename: (periodId) => `payroll-${periodSlug(periodId)}${suffix}.qbxml`,
        exportContent: (records, period) =>
          aggregate
            ? exportToQBXMLAggregate(records, period, options.qbxml)
            : exportToQBXML(records, period, options.qbxml),
      };

    case "qbOnlineCsv":
      return {
        format,
        mimeType: "text/csv",
        filename: (periodId) =>
          `payroll-qbo-${periodSlug(periodId)}${suffix}.csv`,
        exportContent: (records, period) =>
          aggregate
            ? exportToQBOnlineCSVAggregate(records, period, options.qbOnlineCsv)
            : exportToQBOnlineCSV(records, period, options.qbOnlineCsv),
      };

    case "json":
      return {
        format,
        mimeType: "application/json",
        filename: (periodId) => `payroll-${periodSlug(periodId)}.json`,
        exportContent: (records, period) =>
          JSON.stringify(
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
          ),
      };

    default:
      throw new Error(`Unsupported export format: ${format}`);
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
  const exporter = createPayrollExporter(options);
  return {
    format: exporter.format,
    content: exporter.exportContent(records, period),
    filename: exporter.filename(period.id),
    mimeType: exporter.mimeType,
  };
}
