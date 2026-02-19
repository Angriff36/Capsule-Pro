/**
 * QuickBooks Bill Export Utility
 *
 * Generates QuickBooks-compatible files for bill (accounts payable) import.
 * Supports QuickBooks Online CSV and Desktop (IIF) formats.
 */

/**
 * Bill data structure for QuickBooks export
 */
export interface BillRecord {
  /** Unique bill number / reference */
  billNumber: string;
  /** Vendor name (must match QuickBooks vendor) */
  vendorName: string;
  /** Vendor address (optional) */
  vendorAddress?: string | null;
  /** Bill date */
  billDate: Date;
  /** Due date */
  dueDate: Date;
  /** Line items on the bill */
  lineItems: BillLineItem[];
  /** Subtotal before tax */
  subtotal: number;
  /** Tax amount */
  taxAmount: number;
  /** Shipping amount */
  shippingAmount: number;
  /** Total amount */
  totalAmount: number;
  /** Memo/notes */
  memo?: string | null;
  /** Currency code */
  currency?: string;
  /** Terms (e.g., "Net 30") */
  terms?: string;
}

/**
 * Line item on a bill
 */
export interface BillLineItem {
  /** Item name/ID in QuickBooks */
  item: string;
  /** Description of the line item */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit cost/price */
  unitCost: number;
  /** Line amount (quantity * unitCost) */
  amount: number;
  /** Expense account for this line item */
  expenseAccount?: string;
  /** Whether the item is taxable */
  taxable?: boolean;
  /** Service date if different from bill date */
  serviceDate?: Date | null;
}

/**
 * Account mappings for QuickBooks bill export
 */
export interface QBBillAccountMappings {
  /** Default expense account for inventory items */
  expenseAccount: string;
  /** Accounts Payable account */
  accountsPayable: string;
  /** Tax code for taxable items */
  taxCode: string;
  /** Tax code for non-taxable items */
  nonTaxCode: string;
  /** Default item name for inventory purchases */
  inventoryItem: string;
  /** Default item name for shipping */
  shippingItem: string;
}

/**
 * Default account mappings for QuickBooks
 */
const DEFAULT_QB_BILL_MAPPINGS: QBBillAccountMappings = {
  expenseAccount: "Cost of Goods Sold",
  accountsPayable: "Accounts Payable",
  taxCode: "Tax",
  nonTaxCode: "Non",
  inventoryItem: "Inventory Purchase",
  shippingItem: "Shipping",
};

/**
 * Export options
 */
export interface QBBillExportOptions {
  /** Include header row */
  includeHeader?: boolean;
  /** Date format: US (MM/DD/YYYY) or ISO (YYYY-MM-DD) */
  dateFormat?: "us" | "iso";
  /** Account mappings */
  accountMappings?: Partial<QBBillAccountMappings>;
  /** Payment terms (days) - will be overridden by bill-specific terms */
  paymentTerms?: number;
}

/**
 * QuickBooks Online Bill CSV columns
 * Reference: https://quickbooks.intuit.com/learn/support/en-us/help-article/create-transactions/import-bills-quickbooks-online/L7c5sPhwq_US_en
 */
const QBO_BILL_COLUMNS = [
  "*BillNo",
  "*Vendor",
  "*BillDate",
  "*DueDate",
  "Terms",
  "Memo",
  "*Item",
  "*BillLineDescription",
  "*BillLineQuantity",
  "*BillLineUnitCost",
  "*BillLineAmount",
  "BillLineTaxable",
  "ExpenseAccount",
  "ServiceDate",
  "Currency",
  "VendorAddress",
];

/**
 * Escape CSV field value
 */
function escapeCSV(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format date for QuickBooks CSV
 */
function formatDateForQB(date: Date, format: "us" | "iso" = "us"): string {
  if (format === "iso") {
    return date.toISOString().split("T")[0];
  }
  // US format: MM/DD/YYYY
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Format amount with 2 decimal places
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Bill builder for fluent construction
 */
export class QBBillBuilder {
  private bill?: BillRecord;
  private options: QBBillExportOptions = {};

  setBill(bill: BillRecord): this {
    this.bill = bill;
    return this;
  }

  setOptions(options: QBBillExportOptions): this {
    this.options = options;
    return this;
  }

  /**
   * Build CSV lines for this bill
   */
  buildLines(): string[][] {
    if (!this.bill) {
      throw new Error("Bill must be set before building");
    }
    return buildBillLines(this.bill, this.options);
  }
}

/**
 * Build CSV lines for a single bill
 */
function buildBillLines(
  bill: BillRecord,
  options: QBBillExportOptions
): string[][] {
  const dateFormat = options.dateFormat || "us";
  const currency = bill.currency || "USD";
  const terms = bill.terms || `Net ${options.paymentTerms ?? 30}`;

  const billDate = formatDateForQB(bill.billDate, dateFormat);
  const dueDate = formatDateForQB(bill.dueDate, dateFormat);

  const lines: string[][] = [];

  // Add each line item
  for (const lineItem of bill.lineItems) {
    const serviceDate = lineItem.serviceDate
      ? formatDateForQB(lineItem.serviceDate, dateFormat)
      : "";

    lines.push([
      bill.billNumber,
      bill.vendorName,
      billDate,
      dueDate,
      terms,
      bill.memo || "",
      lineItem.item,
      lineItem.description,
      String(lineItem.quantity),
      formatAmount(lineItem.unitCost),
      formatAmount(lineItem.amount),
      lineItem.taxable ? "Y" : "N",
      lineItem.expenseAccount || "",
      serviceDate,
      currency,
      bill.vendorAddress || "",
    ]);
  }

  // Add shipping line if applicable
  if (bill.shippingAmount > 0) {
    const mappings = {
      ...DEFAULT_QB_BILL_MAPPINGS,
      ...options.accountMappings,
    };
    lines.push([
      bill.billNumber,
      bill.vendorName,
      billDate,
      dueDate,
      terms,
      "",
      mappings.shippingItem,
      "Shipping",
      "1",
      formatAmount(bill.shippingAmount),
      formatAmount(bill.shippingAmount),
      "N",
      mappings.expenseAccount,
      "",
      currency,
      bill.vendorAddress || "",
    ]);
  }

  return lines;
}

/**
 * Export bills to QuickBooks Online CSV format
 */
export function exportBillsToQBOnlineCSV(
  bills: BillRecord[],
  options: QBBillExportOptions = {}
): string {
  const { includeHeader = true } = options;
  const allLines: string[][] = [];

  // Add header
  if (includeHeader) {
    allLines.push(QBO_BILL_COLUMNS);
  }

  // Generate lines for each bill
  for (const bill of bills) {
    const builder = new QBBillBuilder().setBill(bill).setOptions(options);
    allLines.push(...builder.buildLines());
  }

  // Convert to CSV string
  return allLines.map((line) => line.map(escapeCSV).join(",")).join("\n");
}

/**
 * QuickBooks Desktop IIF file column headers for bills
 */
const IIF_BILL_COLUMNS = [
  "!TRNS",
  "TRNSTYPE",
  "DATE",
  "ACCNT",
  "NAME",
  "CLASS",
  "AMOUNT",
  "DOCNUM",
  "MEMO",
  "ADDR1",
  "ADDR2",
  "ADDR3",
  "ADDR4",
  "ADDR5",
  "DUEDATE",
  "TERMS",
  "PAID",
];

/**
 * Export bills to QuickBooks Desktop IIF format
 */
export function exportBillsToIIF(
  bills: BillRecord[],
  options: QBBillExportOptions = {}
): string {
  const dateFormat = options.dateFormat || "us";
  const mappings = {
    ...DEFAULT_QB_BILL_MAPPINGS,
    ...options.accountMappings,
  };

  const lines: string[][] = [];

  // Header row for transactions
  lines.push(IIF_BILL_COLUMNS);

  for (const bill of bills) {
    const billDate = formatDateForQB(bill.billDate, dateFormat);
    const dueDate = formatDateForQB(bill.dueDate, dateFormat);
    const terms = bill.terms || `Net ${options.paymentTerms ?? 30}`;

    // Transaction header
    lines.push([
      "TRNS",
      "BILL",
      billDate,
      mappings.accountsPayable,
      bill.vendorName,
      "",
      formatAmount(bill.totalAmount), // Positive for AP (we owe money)
      bill.billNumber,
      bill.memo || "",
      bill.vendorAddress || "",
      "",
      "",
      "",
      "",
      dueDate,
      terms,
      "N",
    ]);

    // Line items (expenses)
    for (const lineItem of bill.lineItems) {
      lines.push([
        "SPL",
        "BILL",
        billDate,
        lineItem.expenseAccount || mappings.expenseAccount,
        bill.vendorName,
        "",
        formatAmount(-lineItem.amount), // Negative for expense (credit)
        bill.billNumber,
        lineItem.description,
        String(lineItem.quantity),
        formatAmount(lineItem.unitCost),
        lineItem.item,
        lineItem.taxable ? "Y" : "N",
        "",
      ]);
    }

    // Shipping line if applicable
    if (bill.shippingAmount > 0) {
      lines.push([
        "SPL",
        "BILL",
        billDate,
        mappings.expenseAccount,
        bill.vendorName,
        "",
        formatAmount(-bill.shippingAmount), // Negative for expense
        bill.billNumber,
        "Shipping",
        "1",
        formatAmount(bill.shippingAmount),
        mappings.shippingItem,
        "N",
        "",
      ]);
    }

    // Tax line if applicable
    if (bill.taxAmount > 0) {
      lines.push([
        "SPL",
        "BILL",
        billDate,
        "Sales Tax Payable",
        bill.vendorName,
        "",
        formatAmount(-bill.taxAmount), // Negative for tax
        bill.billNumber,
        "Sales Tax",
        "",
        "",
        "",
        "N",
        "",
      ]);
    }

    // End transaction
    lines.push(["ENDTRNS"]);
  }

  return lines.map((line) => line.map(escapeCSV).join("\t")).join("\n");
}

/**
 * Export result
 */
export interface BillExportResult {
  format: "qbOnlineCsv" | "iif";
  content: string;
  filename: string;
  mimeType: string;
}

/**
 * Unified export function
 */
export function exportBills(
  bills: BillRecord[],
  format: "qbOnlineCsv" | "iif" = "qbOnlineCsv",
  options: QBBillExportOptions = {}
): BillExportResult {
  const timestamp = new Date().toISOString().split("T")[0];

  if (format === "iif") {
    return {
      format: "iif",
      content: exportBillsToIIF(bills, options),
      filename: `bills-${timestamp}.iif`,
      mimeType: "text/plain",
    };
  }

  return {
    format: "qbOnlineCsv",
    content: exportBillsToQBOnlineCSV(bills, options),
    filename: `bills-${timestamp}.csv`,
    mimeType: "text/csv",
  };
}
