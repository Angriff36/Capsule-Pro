import { formatDate } from "../core/currency";
import type { PayrollPeriod, PayrollRecord } from "../models";

/**
 * QuickBooks Desktop XML Export Configuration
 */
export type QBXMLExportOptions = {
  companyName?: string;
  journalEntryPrefix?: string;
  accountMappings?: QBAccountMappings;
};

/**
 * QuickBooks GL Account Mappings
 */
export type QBAccountMappings = {
  wagesExpense: string; // Expense account for regular wages
  overtimeExpense: string; // Expense account for overtime
  tipsExpense: string; // Expense account for tips
  federalTaxPayable: string; // Liability for federal tax
  stateTaxPayable: string; // Liability for state tax
  socialSecurityPayable: string; // Liability for SS
  medicarePayable: string; // Liability for Medicare
  benefitsPayable: string; // Liability for benefits deductions
  retirementPayable: string; // Liability for 401k
  garnishmentsPayable: string; // Liability for garnishments
  cashAccount: string; // Cash/Bank account for net pay
};

/**
 * Default QB account mappings
 */
const DEFAULT_ACCOUNT_MAPPINGS: QBAccountMappings = {
  wagesExpense: "Payroll Expenses:Wages",
  overtimeExpense: "Payroll Expenses:Overtime",
  tipsExpense: "Payroll Expenses:Tips",
  federalTaxPayable: "Payroll Liabilities:Federal Tax Payable",
  stateTaxPayable: "Payroll Liabilities:State Tax Payable",
  socialSecurityPayable: "Payroll Liabilities:Social Security Payable",
  medicarePayable: "Payroll Liabilities:Medicare Payable",
  benefitsPayable: "Payroll Liabilities:Benefits Payable",
  retirementPayable: "Payroll Liabilities:401k Payable",
  garnishmentsPayable: "Payroll Liabilities:Garnishments Payable",
  cashAccount: "Checking Account",
};

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format amount for QBXML (no commas, 2 decimals)
 */
function formatAmount(amount: number): string {
  return Math.abs(amount).toFixed(2);
}

/**
 * Create a journal entry line for QBXML
 */
function createJournalLine(
  accountName: string,
  amount: number,
  memo: string,
  isCredit: boolean
): string {
  const lineType = isCredit ? "JournalCreditLine" : "JournalDebitLine";

  return `
      <${lineType}>
        <AccountRef>
          <FullName>${escapeXML(accountName)}</FullName>
        </AccountRef>
        <Amount>${formatAmount(amount)}</Amount>
        <Memo>${escapeXML(memo)}</Memo>
      </${lineType}>`;
}

/**
 * Create journal entries for a single payroll record
 */
function createEmployeeJournalEntries(
  record: PayrollRecord,
  period: PayrollPeriod,
  accounts: QBAccountMappings,
  entryPrefix: string
): string {
  const lines: string[] = [];
  const memo = `Payroll - ${record.employeeName} - ${formatDate(period.startDate, "qb")} to ${formatDate(period.endDate, "qb")}`;

  // DEBITS (Expenses)

  // Regular wages
  if (record.regularPay > 0) {
    lines.push(
      createJournalLine(
        accounts.wagesExpense,
        record.regularPay,
        `Regular wages - ${record.hoursRegular}hrs`,
        false
      )
    );
  }

  // Overtime
  if (record.overtimePay > 0) {
    lines.push(
      createJournalLine(
        accounts.overtimeExpense,
        record.overtimePay,
        `Overtime - ${record.hoursOvertime}hrs`,
        false
      )
    );
  }

  // Tips
  if (record.tips > 0) {
    lines.push(
      createJournalLine(
        accounts.tipsExpense,
        record.tips,
        "Tips allocation",
        false
      )
    );
  }

  // CREDITS (Liabilities and Cash)

  // Federal tax
  const federalTax = record.taxesWithheld.find((t) => t.type === "federal");
  if (federalTax && federalTax.amount > 0) {
    lines.push(
      createJournalLine(
        accounts.federalTaxPayable,
        federalTax.amount,
        "Federal income tax withholding",
        true
      )
    );
  }

  // State tax
  const stateTax = record.taxesWithheld.find((t) => t.type === "state");
  if (stateTax && stateTax.amount > 0) {
    lines.push(
      createJournalLine(
        accounts.stateTaxPayable,
        stateTax.amount,
        `State tax withholding - ${stateTax.jurisdiction || ""}`,
        true
      )
    );
  }

  // Social Security
  const ssTax = record.taxesWithheld.find((t) => t.type === "social_security");
  if (ssTax && ssTax.amount > 0) {
    lines.push(
      createJournalLine(
        accounts.socialSecurityPayable,
        ssTax.amount,
        "Social Security withholding",
        true
      )
    );
  }

  // Medicare
  const medicareTax = record.taxesWithheld.find((t) => t.type === "medicare");
  if (medicareTax && medicareTax.amount > 0) {
    lines.push(
      createJournalLine(
        accounts.medicarePayable,
        medicareTax.amount,
        "Medicare withholding",
        true
      )
    );
  }

  // Deductions by type
  const allDeductions = [
    ...record.preTaxDeductions,
    ...record.postTaxDeductions,
  ];

  // Benefits
  const benefits = allDeductions.filter((d) =>
    [
      "benefits",
      "health_insurance",
      "dental_insurance",
      "vision_insurance",
    ].includes(d.type)
  );
  const benefitsTotal = benefits.reduce((sum, d) => sum + d.amount, 0);
  if (benefitsTotal > 0) {
    lines.push(
      createJournalLine(
        accounts.benefitsPayable,
        benefitsTotal,
        "Benefits deductions",
        true
      )
    );
  }

  // Retirement
  const retirement = allDeductions.filter((d) =>
    ["retirement_401k", "retirement_ira"].includes(d.type)
  );
  const retirementTotal = retirement.reduce((sum, d) => sum + d.amount, 0);
  if (retirementTotal > 0) {
    lines.push(
      createJournalLine(
        accounts.retirementPayable,
        retirementTotal,
        "Retirement contributions",
        true
      )
    );
  }

  // Garnishments
  const garnishments = allDeductions.filter((d) =>
    ["garnishment", "child_support"].includes(d.type)
  );
  const garnishmentsTotal = garnishments.reduce((sum, d) => sum + d.amount, 0);
  if (garnishmentsTotal > 0) {
    lines.push(
      createJournalLine(
        accounts.garnishmentsPayable,
        garnishmentsTotal,
        "Garnishment deductions",
        true
      )
    );
  }

  // Net pay to cash
  if (record.netPay > 0) {
    lines.push(
      createJournalLine(
        accounts.cashAccount,
        record.netPay,
        `Net pay - ${record.employeeName}`,
        true
      )
    );
  }

  const refNumber = `${entryPrefix}${record.periodId.slice(0, 8)}-${record.employeeId.slice(0, 4)}`;

  return `
    <JournalEntryAdd>
      <TxnDate>${formatDate(period.endDate, "qb")}</TxnDate>
      <RefNumber>${escapeXML(refNumber)}</RefNumber>
      <Memo>${escapeXML(memo)}</Memo>
      ${lines.join("")}
    </JournalEntryAdd>`;
}

/**
 * Export payroll to QBXML format for QuickBooks Desktop
 */
export function exportToQBXML(
  records: PayrollRecord[],
  period: PayrollPeriod,
  options: QBXMLExportOptions = {}
): string {
  const accounts = { ...DEFAULT_ACCOUNT_MAPPINGS, ...options.accountMappings };
  const entryPrefix = options.journalEntryPrefix || "PR-";

  const journalEntries = records
    .map((record) =>
      createEmployeeJournalEntries(record, period, accounts, entryPrefix)
    )
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="16.0"?>
<QBXML>
  <QBXMLMsgsRq onError="stopOnError">
    ${journalEntries}
  </QBXMLMsgsRq>
</QBXML>`;
}

/**
 * Create aggregate journal entry for entire payroll (single entry with multiple lines)
 */
export function exportToQBXMLAggregate(
  records: PayrollRecord[],
  period: PayrollPeriod,
  options: QBXMLExportOptions = {}
): string {
  const accounts = { ...DEFAULT_ACCOUNT_MAPPINGS, ...options.accountMappings };
  const entryPrefix = options.journalEntryPrefix || "PR-";

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
      acc.socialSecurity +=
        r.taxesWithheld.find((t) => t.type === "social_security")?.amount || 0;
      acc.medicare +=
        r.taxesWithheld.find((t) => t.type === "medicare")?.amount || 0;

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
      acc.garnishments += allDeductions
        .filter((d) => ["garnishment", "child_support"].includes(d.type))
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
      socialSecurity: 0,
      medicare: 0,
      benefits: 0,
      retirement: 0,
      garnishments: 0,
      netPay: 0,
    }
  );

  const memo = `Payroll ${formatDate(period.startDate, "qb")} to ${formatDate(period.endDate, "qb")} - ${records.length} employees`;
  const refNumber = `${entryPrefix}${period.id.slice(0, 8)}`;

  const lines: string[] = [];

  // Debits
  if (totals.regularPay > 0) {
    lines.push(
      createJournalLine(
        accounts.wagesExpense,
        totals.regularPay,
        "Total regular wages",
        false
      )
    );
  }
  if (totals.overtimePay > 0) {
    lines.push(
      createJournalLine(
        accounts.overtimeExpense,
        totals.overtimePay,
        "Total overtime",
        false
      )
    );
  }
  if (totals.tips > 0) {
    lines.push(
      createJournalLine(accounts.tipsExpense, totals.tips, "Total tips", false)
    );
  }

  // Credits
  if (totals.federalTax > 0) {
    lines.push(
      createJournalLine(
        accounts.federalTaxPayable,
        totals.federalTax,
        "Federal tax withheld",
        true
      )
    );
  }
  if (totals.stateTax > 0) {
    lines.push(
      createJournalLine(
        accounts.stateTaxPayable,
        totals.stateTax,
        "State tax withheld",
        true
      )
    );
  }
  if (totals.socialSecurity > 0) {
    lines.push(
      createJournalLine(
        accounts.socialSecurityPayable,
        totals.socialSecurity,
        "Social Security withheld",
        true
      )
    );
  }
  if (totals.medicare > 0) {
    lines.push(
      createJournalLine(
        accounts.medicarePayable,
        totals.medicare,
        "Medicare withheld",
        true
      )
    );
  }
  if (totals.benefits > 0) {
    lines.push(
      createJournalLine(
        accounts.benefitsPayable,
        totals.benefits,
        "Benefits deductions",
        true
      )
    );
  }
  if (totals.retirement > 0) {
    lines.push(
      createJournalLine(
        accounts.retirementPayable,
        totals.retirement,
        "Retirement contributions",
        true
      )
    );
  }
  if (totals.garnishments > 0) {
    lines.push(
      createJournalLine(
        accounts.garnishmentsPayable,
        totals.garnishments,
        "Garnishments",
        true
      )
    );
  }
  if (totals.netPay > 0) {
    lines.push(
      createJournalLine(
        accounts.cashAccount,
        totals.netPay,
        "Net payroll",
        true
      )
    );
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="16.0"?>
<QBXML>
  <QBXMLMsgsRq onError="stopOnError">
    <JournalEntryAdd>
      <TxnDate>${formatDate(period.endDate, "qb")}</TxnDate>
      <RefNumber>${escapeXML(refNumber)}</RefNumber>
      <Memo>${escapeXML(memo)}</Memo>
      ${lines.join("")}
    </JournalEntryAdd>
  </QBXMLMsgsRq>
</QBXML>`;
}
