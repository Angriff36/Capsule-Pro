// Payroll Export Modules
// Provides export functionality for CSV, QBXML, and QuickBooks Online formats

export {
  type CsvExportOptions,
  exportSummaryToCSV,
  exportToCSV,
} from "./csvExport";
export {
  exportToQBOnlineCSV,
  exportToQBOnlineCSVAggregate,
  type QBOnlineAccountMappings,
  type QBOnlineCsvExportOptions,
  QBOnlineJournalBuilder,
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

interface PayrollExportContext {
  format: ExportFormatType;
  aggregate: boolean;
  suffix: string;
  periodSlug: (periodId: string) => string;
}

type PayrollExportStrategy = (
  context: PayrollExportContext,
  options: ExportOptions
) => PayrollExporter;

function createExportContext(options: ExportOptions): PayrollExportContext {
  const aggregate = options.aggregate ?? false;
  const suffix = aggregate ? "-aggregate" : "";
  const periodSlug = (periodId: string) => periodId.slice(0, 8);

  return {
    format: options.format,
    aggregate,
    suffix,
    periodSlug,
  };
}

const exportStrategies: Record<ExportFormatType, PayrollExportStrategy> = {
  csv: (context, options) => ({
    format: context.format,
    mimeType: "text/csv",
    filename: (periodId) =>
      `payroll-${context.periodSlug(periodId)}${context.suffix}.csv`,
    exportContent: (records, period) =>
      exportToCSV(records, period, options.csv),
  }),
  qbxml: (context, options) => ({
    format: context.format,
    mimeType: "application/xml",
    filename: (periodId) =>
      `payroll-${context.periodSlug(periodId)}${context.suffix}.qbxml`,
    exportContent: (records, period) =>
      context.aggregate
        ? exportToQBXMLAggregate(records, period, options.qbxml)
        : exportToQBXML(records, period, options.qbxml),
  }),
  qbOnlineCsv: (context, options) => ({
    format: context.format,
    mimeType: "text/csv",
    filename: (periodId) =>
      `payroll-qbo-${context.periodSlug(periodId)}${context.suffix}.csv`,
    exportContent: (records, period) =>
      context.aggregate
        ? exportToQBOnlineCSVAggregate(records, period, options.qbOnlineCsv)
        : exportToQBOnlineCSV(records, period, options.qbOnlineCsv),
  }),
  json: (context) => ({
    format: context.format,
    mimeType: "application/json",
    filename: (periodId) => `payroll-${context.periodSlug(periodId)}.json`,
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
  }),
};

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
  const context = createExportContext(options);
  const strategy = exportStrategies[context.format];

  if (!strategy) {
    throw new Error(`Unsupported export format: ${context.format}`);
  }

  return strategy(context, options);
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
