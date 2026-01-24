// Payroll Export Modules
// Provides export functionality for CSV, QBXML, and QuickBooks Online formats
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get() {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  ((m, exports) => {
    for (var p in m)
      if (p !== "default" && !Object.hasOwn(exports, p))
        __createBinding(exports, m, p);
  });
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPayroll = exportPayroll;
__exportStar(require("./csvExport"), exports);
__exportStar(require("./qbOnlineCsvExport"), exports);
__exportStar(require("./qbxmlExport"), exports);
const csvExport_1 = require("./csvExport");
const qbOnlineCsvExport_1 = require("./qbOnlineCsvExport");
const qbxmlExport_1 = require("./qbxmlExport");
/**
 * Generate filename for export
 */
function generateFilename(format, periodId, aggregate) {
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
function getMimeType(format) {
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
function exportPayroll(records, period, options) {
  const { format, aggregate = false } = options;
  let content;
  switch (format) {
    case "csv":
      content = (0, csvExport_1.exportToCSV)(records, period, options.csv);
      break;
    case "qbxml":
      content = aggregate
        ? (0, qbxmlExport_1.exportToQBXMLAggregate)(
            records,
            period,
            options.qbxml
          )
        : (0, qbxmlExport_1.exportToQBXML)(records, period, options.qbxml);
      break;
    case "qbOnlineCsv":
      content = aggregate
        ? (0, qbOnlineCsvExport_1.exportToQBOnlineCSVAggregate)(
            records,
            period,
            options.qbOnlineCsv
          )
        : (0, qbOnlineCsvExport_1.exportToQBOnlineCSV)(
            records,
            period,
            options.qbOnlineCsv
          );
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
