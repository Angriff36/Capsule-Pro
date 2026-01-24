Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToCSV = exportToCSV;
exports.exportSummaryToCSV = exportSummaryToCSV;
const currency_1 = require("../core/currency");
/**
 * Standard CSV column definitions
 */
const STANDARD_COLUMNS = [
  "EmployeeID",
  "Name",
  "Department",
  "Role",
  "RegularHours",
  "OvertimeHours",
  "RegularPay",
  "OvertimePay",
  "Tips",
  "GrossPay",
  "PreTaxDeductions",
  "TaxableIncome",
  "FederalTax",
  "StateTax",
  "SocialSecurity",
  "Medicare",
  "TotalTaxes",
  "PostTaxDeductions",
  "TotalDeductions",
  "NetPay",
  "Currency",
  "PeriodStart",
  "PeriodEnd",
];
/**
 * Escape CSV field value
 */
function escapeCSV(value, delimiter = ",") {
  if (value === undefined || value === null) return "";
  const str = String(value);
  // Escape if contains delimiter, quote, or newline
  if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
/**
 * Get tax amount by type from record
 */
function getTaxByType(record, type) {
  const tax = record.taxesWithheld.find((t) => t.type === type);
  return tax?.amount || 0;
}
/**
 * Sum deductions by pre/post tax
 */
function sumDeductions(record, preTax) {
  const deductions = preTax
    ? record.preTaxDeductions
    : record.postTaxDeductions;
  return deductions.reduce((sum, d) => sum + d.amount, 0);
}
/**
 * Mask employee ID for external processors
 */
function maskId(id, mask) {
  if (!mask) return id;
  if (id.length <= 4) return "****";
  return `****-${id.slice(-4)}`;
}
/**
 * Convert a single payroll record to CSV row
 */
function recordToRow(record, period, options) {
  const { dateFormat = "iso", maskSensitiveData = false } = options;
  return [
    escapeCSV(maskId(record.employeeId, maskSensitiveData)),
    escapeCSV(record.employeeName),
    escapeCSV(record.department || ""),
    escapeCSV(record.roleName),
    escapeCSV(record.hoursRegular.toFixed(2)),
    escapeCSV(record.hoursOvertime.toFixed(2)),
    escapeCSV(record.regularPay.toFixed(2)),
    escapeCSV(record.overtimePay.toFixed(2)),
    escapeCSV(record.tips.toFixed(2)),
    escapeCSV(record.grossPay.toFixed(2)),
    escapeCSV(sumDeductions(record, true).toFixed(2)),
    escapeCSV(record.taxableIncome.toFixed(2)),
    escapeCSV(getTaxByType(record, "federal").toFixed(2)),
    escapeCSV(getTaxByType(record, "state").toFixed(2)),
    escapeCSV(getTaxByType(record, "social_security").toFixed(2)),
    escapeCSV(getTaxByType(record, "medicare").toFixed(2)),
    escapeCSV(record.totalTaxes.toFixed(2)),
    escapeCSV(sumDeductions(record, false).toFixed(2)),
    escapeCSV(record.totalDeductions.toFixed(2)),
    escapeCSV(record.netPay.toFixed(2)),
    escapeCSV(record.currency),
    escapeCSV((0, currency_1.formatDate)(period.startDate, dateFormat)),
    escapeCSV((0, currency_1.formatDate)(period.endDate, dateFormat)),
  ];
}
/**
 * Export payroll records to CSV format
 */
function exportToCSV(records, period, options = {}) {
  const { includeHeader = true, delimiter = "," } = options;
  const lines = [];
  // Add header row
  if (includeHeader) {
    lines.push(STANDARD_COLUMNS.join(delimiter));
  }
  // Add data rows
  for (const record of records) {
    const row = recordToRow(record, period, options);
    lines.push(row.join(delimiter));
  }
  return lines.join("\n");
}
/**
 * Export payroll summary to CSV
 */
function exportSummaryToCSV(summary, period, options = {}) {
  const { delimiter = "," } = options;
  const lines = [
    ["Metric", "Value"].join(delimiter),
    [
      "Period Start",
      (0, currency_1.formatDate)(period.startDate, options.dateFormat || "iso"),
    ].join(delimiter),
    [
      "Period End",
      (0, currency_1.formatDate)(period.endDate, options.dateFormat || "iso"),
    ].join(delimiter),
    ["Total Employees", String(summary.totalEmployees)].join(delimiter),
    ["Total Regular Hours", summary.totalRegularHours.toFixed(2)].join(
      delimiter
    ),
    ["Total Overtime Hours", summary.totalOvertimeHours.toFixed(2)].join(
      delimiter
    ),
    ["Total Tips", summary.totalTips.toFixed(2)].join(delimiter),
    ["Total Gross Pay", summary.totalGrossPay.toFixed(2)].join(delimiter),
    ["Total Taxes", summary.totalTaxes.toFixed(2)].join(delimiter),
    ["Total Deductions", summary.totalDeductions.toFixed(2)].join(delimiter),
    ["Total Net Pay", summary.totalNetPay.toFixed(2)].join(delimiter),
    ["Currency", period.currency].join(delimiter),
  ];
  return lines.join("\n");
}
