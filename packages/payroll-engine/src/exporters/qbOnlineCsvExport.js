Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToQBOnlineCSV = exportToQBOnlineCSV;
exports.exportToQBOnlineCSVAggregate = exportToQBOnlineCSVAggregate;
const currency_1 = require("../core/currency");
/**
 * Default QB Online account mappings
 */
const DEFAULT_QBO_ACCOUNT_MAPPINGS = {
  wagesAccount: "Payroll Expenses:Wages & Salaries",
  overtimeAccount: "Payroll Expenses:Overtime",
  tipsAccount: "Payroll Expenses:Tips",
  federalTaxAccount: "Payroll Liabilities:Federal Taxes",
  stateTaxAccount: "Payroll Liabilities:State Taxes",
  ficaAccount: "Payroll Liabilities:FICA",
  benefitsAccount: "Payroll Liabilities:Benefits",
  retirementAccount: "Payroll Liabilities:401(k)",
  cashAccount: "Checking",
};
/**
 * QuickBooks Online Journal Entry CSV columns
 */
const QBO_JOURNAL_COLUMNS = [
  "*JournalNo",
  "*JournalDate",
  "*Currency",
  "Memo",
  "*AccountName",
  "Debits",
  "Credits",
  "Description",
  "Name",
  "Location",
  "Class",
];
/**
 * Escape CSV field for QBO
 */
function escapeQBOCSV(value) {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
/**
 * Format amount as string with 2 decimals, or empty if zero
 */
function formatAmountOrEmpty(amount) {
  if (Math.abs(amount) < 0.01) return "";
  return amount.toFixed(2);
}
/**
 * Create journal entry lines for a single payroll record
 */
function createEmployeeJournalLines(
  record,
  period,
  journalNo,
  accounts,
  options
) {
  const dateFormat = options.dateFormat || "us";
  const journalDate = (0, currency_1.formatDate)(period.endDate, dateFormat);
  const memo = `Payroll - ${record.employeeName}`;
  const currency = record.currency || "USD";
  const lines = [];
  // Debit: Regular wages
  if (record.regularPay > 0) {
    lines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.wagesAccount,
      formatAmountOrEmpty(record.regularPay),
      "",
      `Regular pay ${record.hoursRegular}hrs`,
      record.employeeName,
      record.department || "",
      "",
    ]);
  }
  // Debit: Overtime
  if (record.overtimePay > 0) {
    lines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.overtimeAccount,
      formatAmountOrEmpty(record.overtimePay),
      "",
      `Overtime ${record.hoursOvertime}hrs`,
      record.employeeName,
      record.department || "",
      "",
    ]);
  }
  // Debit: Tips
  if (record.tips > 0) {
    lines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.tipsAccount,
      formatAmountOrEmpty(record.tips),
      "",
      "Tips",
      record.employeeName,
      record.department || "",
      "",
    ]);
  }
  // Credit: Federal tax
  const federalTax = record.taxesWithheld.find((t) => t.type === "federal");
  if (federalTax && federalTax.amount > 0) {
    lines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.federalTaxAccount,
      "",
      formatAmountOrEmpty(federalTax.amount),
      "Federal tax withholding",
      record.employeeName,
      "",
      "",
    ]);
  }
  // Credit: State tax
  const stateTax = record.taxesWithheld.find((t) => t.type === "state");
  if (stateTax && stateTax.amount > 0) {
    lines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.stateTaxAccount,
      "",
      formatAmountOrEmpty(stateTax.amount),
      `State tax - ${stateTax.jurisdiction || ""}`,
      record.employeeName,
      "",
      "",
    ]);
  }
  // Credit: FICA (combined SS + Medicare)
  const ssTax =
    record.taxesWithheld.find((t) => t.type === "social_security")?.amount || 0;
  const medicareTax =
    record.taxesWithheld.find((t) => t.type === "medicare")?.amount || 0;
  const ficaTotal = ssTax + medicareTax;
  if (ficaTotal > 0) {
    lines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.ficaAccount,
      "",
      formatAmountOrEmpty(ficaTotal),
      "FICA withholding",
      record.employeeName,
      "",
      "",
    ]);
  }
  // Credit: Benefits deductions
  const allDeductions = [
    ...record.preTaxDeductions,
    ...record.postTaxDeductions,
  ];
  const benefitsTotal = allDeductions
    .filter((d) =>
      [
        "benefits",
        "health_insurance",
        "dental_insurance",
        "vision_insurance",
      ].includes(d.type)
    )
    .reduce((sum, d) => sum + d.amount, 0);
  if (benefitsTotal > 0) {
    lines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.benefitsAccount,
      "",
      formatAmountOrEmpty(benefitsTotal),
      "Benefits deductions",
      record.employeeName,
      "",
      "",
    ]);
  }
  // Credit: Retirement
  const retirementTotal = allDeductions
    .filter((d) => ["retirement_401k", "retirement_ira"].includes(d.type))
    .reduce((sum, d) => sum + d.amount, 0);
  if (retirementTotal > 0) {
    lines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.retirementAccount,
      "",
      formatAmountOrEmpty(retirementTotal),
      "Retirement contribution",
      record.employeeName,
      "",
      "",
    ]);
  }
  // Credit: Net pay (cash)
  if (record.netPay > 0) {
    lines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.cashAccount,
      "",
      formatAmountOrEmpty(record.netPay),
      "Net pay",
      record.employeeName,
      "",
      "",
    ]);
  }
  return lines;
}
/**
 * Export payroll to QuickBooks Online CSV format
 */
function exportToQBOnlineCSV(records, period, options = {}) {
  const { includeHeader = true } = options;
  const accounts = {
    ...DEFAULT_QBO_ACCOUNT_MAPPINGS,
    ...options.accountMappings,
  };
  const allLines = [];
  // Add header
  if (includeHeader) {
    allLines.push(QBO_JOURNAL_COLUMNS);
  }
  // Generate journal entries for each employee
  records.forEach((record, index) => {
    const journalNo = `PR-${period.id.slice(0, 8)}-${String(index + 1).padStart(3, "0")}`;
    const lines = createEmployeeJournalLines(
      record,
      period,
      journalNo,
      accounts,
      options
    );
    allLines.push(...lines);
  });
  // Convert to CSV string
  return allLines.map((line) => line.map(escapeQBOCSV).join(",")).join("\n");
}
/**
 * Export aggregate payroll journal entry to QBO CSV
 */
function exportToQBOnlineCSVAggregate(records, period, options = {}) {
  const { includeHeader = true } = options;
  const accounts = {
    ...DEFAULT_QBO_ACCOUNT_MAPPINGS,
    ...options.accountMappings,
  };
  const dateFormat = options.dateFormat || "us";
  const journalNo = `PR-${period.id.slice(0, 8)}`;
  const journalDate = (0, currency_1.formatDate)(period.endDate, dateFormat);
  const memo = `Payroll ${(0, currency_1.formatDate)(period.startDate, dateFormat)} to ${journalDate}`;
  const currency = period.currency || "USD";
  // Aggregate totals
  const totals = records.reduce(
    (acc, r) => {
      acc.regularPay += r.regularPay;
      acc.overtimePay += r.overtimePay;
      acc.tips += r.tips;
      acc.federalTax +=
        r.taxesWithheld.find((t) => t.type === "federal")?.amount || 0;
      acc.stateTax +=
        r.taxesWithheld.find((t) => t.type === "state")?.amount || 0;
      acc.fica +=
        (r.taxesWithheld.find((t) => t.type === "social_security")?.amount ||
          0) +
        (r.taxesWithheld.find((t) => t.type === "medicare")?.amount || 0);
      const allDeductions = [...r.preTaxDeductions, ...r.postTaxDeductions];
      acc.benefits += allDeductions
        .filter((d) =>
          [
            "benefits",
            "health_insurance",
            "dental_insurance",
            "vision_insurance",
          ].includes(d.type)
        )
        .reduce((sum, d) => sum + d.amount, 0);
      acc.retirement += allDeductions
        .filter((d) => ["retirement_401k", "retirement_ira"].includes(d.type))
        .reduce((sum, d) => sum + d.amount, 0);
      acc.netPay += r.netPay;
      return acc;
    },
    {
      regularPay: 0,
      overtimePay: 0,
      tips: 0,
      federalTax: 0,
      stateTax: 0,
      fica: 0,
      benefits: 0,
      retirement: 0,
      netPay: 0,
    }
  );
  const allLines = [];
  if (includeHeader) {
    allLines.push(QBO_JOURNAL_COLUMNS);
  }
  // Debits
  if (totals.regularPay > 0) {
    allLines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.wagesAccount,
      formatAmountOrEmpty(totals.regularPay),
      "",
      "Total regular wages",
      "",
      "",
      "",
    ]);
  }
  if (totals.overtimePay > 0) {
    allLines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.overtimeAccount,
      formatAmountOrEmpty(totals.overtimePay),
      "",
      "Total overtime",
      "",
      "",
      "",
    ]);
  }
  if (totals.tips > 0) {
    allLines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.tipsAccount,
      formatAmountOrEmpty(totals.tips),
      "",
      "Total tips",
      "",
      "",
      "",
    ]);
  }
  // Credits
  if (totals.federalTax > 0) {
    allLines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.federalTaxAccount,
      "",
      formatAmountOrEmpty(totals.federalTax),
      "Federal tax",
      "",
      "",
      "",
    ]);
  }
  if (totals.stateTax > 0) {
    allLines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.stateTaxAccount,
      "",
      formatAmountOrEmpty(totals.stateTax),
      "State tax",
      "",
      "",
      "",
    ]);
  }
  if (totals.fica > 0) {
    allLines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.ficaAccount,
      "",
      formatAmountOrEmpty(totals.fica),
      "FICA",
      "",
      "",
      "",
    ]);
  }
  if (totals.benefits > 0) {
    allLines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.benefitsAccount,
      "",
      formatAmountOrEmpty(totals.benefits),
      "Benefits",
      "",
      "",
      "",
    ]);
  }
  if (totals.retirement > 0) {
    allLines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.retirementAccount,
      "",
      formatAmountOrEmpty(totals.retirement),
      "Retirement",
      "",
      "",
      "",
    ]);
  }
  if (totals.netPay > 0) {
    allLines.push([
      journalNo,
      journalDate,
      currency,
      memo,
      accounts.cashAccount,
      "",
      formatAmountOrEmpty(totals.netPay),
      "Net payroll",
      "",
      "",
      "",
    ]);
  }
  return allLines.map((line) => line.map(escapeQBOCSV).join(",")).join("\n");
}
