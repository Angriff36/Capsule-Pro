/**
 * QuickBooks Invoice Export Utility
 *
 * Generates QuickBooks-compatible CSV files for invoice import.
 * Supports QuickBooks Online and Desktop (IIF) formats.
 */

/**
 * Invoice data structure for QuickBooks export
 */
export interface InvoiceRecord {
  /** Unique invoice number */
  invoiceNumber: string;
  /** Customer name (must match QuickBooks customer) */
  customerName: string;
  /** Customer email for delivery */
  customerEmail?: string | null;
  /** Invoice date */
  invoiceDate: Date;
  /** Due date */
  dueDate: Date;
  /** Line items on the invoice */
  lineItems: InvoiceLineItem[];
  /** Subtotal before tax */
  subtotal: number;
  /** Tax amount */
  taxAmount: number;
  /** Discount amount */
  discountAmount: number;
  /** Total amount */
  totalAmount: number;
  /** Memo/notes */
  memo?: string | null;
  /** Currency code */
  currency?: string;
}

/**
 * Line item on an invoice
 */
export interface InvoiceLineItem {
  /** Item name/ID in QuickBooks */
  item: string;
  /** Description of the line item */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit rate/price */
  rate: number;
  /** Line amount (quantity * rate) */
  amount: number;
  /** Whether the item is taxable */
  taxable?: boolean;
  /** Service date if different from invoice date */
  serviceDate?: Date | null;
}

/**
 * Account mappings for QuickBooks invoice export
 */
export interface QBInvoiceAccountMappings {
  /** Default income account for service items */
  incomeAccount: string;
  /** Tax code for taxable items */
  taxCode: string;
  /** Tax code for non-taxable items */
  nonTaxCode: string;
  /** Default item name for catering services */
  cateringItem: string;
  /** Default item name for service charges */
  serviceChargeItem: string;
  /** Default item name for discounts */
  discountItem: string;
}

/**
 * Default account mappings for QuickBooks
 */
const DEFAULT_QB_INVOICE_MAPPINGS: QBInvoiceAccountMappings = {
  incomeAccount: "Sales:Services",
  taxCode: "Tax",
  nonTaxCode: "Non",
  cateringItem: "Catering Services",
  serviceChargeItem: "Service Charge",
  discountItem: "Discount",
};

/**
 * Export options
 */
export interface QBInvoiceExportOptions {
  /** Include header row */
  includeHeader?: boolean;
  /** Date format: US (MM/DD/YYYY) or ISO (YYYY-MM-DD) */
  dateFormat?: "us" | "iso";
  /** Account mappings */
  accountMappings?: Partial<QBInvoiceAccountMappings>;
  /** Payment terms (days) */
  paymentTerms?: number;
}

/**
 * QuickBooks Online Invoice CSV columns
 * Reference: https://quickbooks.intuit.com/learn/support/en-us/help-article/create-transactions/import-invoices-quickbooks-online/L7c5sPhwq_US_en
 */
const QBO_INVOICE_COLUMNS = [
  "*InvoiceNo",
  "*Customer",
  "*InvoiceDate",
  "*DueDate",
  "Terms",
  "Location",
  "Memo",
  "*Item",
  "*InvoiceLineDescription",
  "*InvoiceLineQuantity",
  "*InvoiceLineRate",
  "*InvoiceLineAmount",
  "InvoiceLineTaxable",
  "ServiceDate",
  "Currency",
  "EmailAddress",
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
 * Invoice builder for fluent construction
 */
export class QBInvoiceBuilder {
  private invoice?: InvoiceRecord;
  private options: QBInvoiceExportOptions = {};

  setInvoice(invoice: InvoiceRecord): this {
    this.invoice = invoice;
    return this;
  }

  setOptions(options: QBInvoiceExportOptions): this {
    this.options = options;
    return this;
  }

  /**
   * Build CSV lines for this invoice
   */
  buildLines(): string[][] {
    if (!this.invoice) {
      throw new Error("Invoice must be set before building");
    }
    return buildInvoiceLines(this.invoice, this.options);
  }
}

/**
 * Build CSV lines for a single invoice
 */
function buildInvoiceLines(
  invoice: InvoiceRecord,
  options: QBInvoiceExportOptions
): string[][] {
  const dateFormat = options.dateFormat || "us";
  const paymentTerms = options.paymentTerms ?? 30;
  const currency = invoice.currency || "USD";

  const invoiceDate = formatDateForQB(invoice.invoiceDate, dateFormat);
  const dueDate = formatDateForQB(invoice.dueDate, dateFormat);

  const lines: string[][] = [];

  // Add each line item
  for (const lineItem of invoice.lineItems) {
    const serviceDate = lineItem.serviceDate
      ? formatDateForQB(lineItem.serviceDate, dateFormat)
      : "";

    lines.push([
      invoice.invoiceNumber,
      invoice.customerName,
      invoiceDate,
      dueDate,
      `Net ${paymentTerms}`,
      "",
      invoice.memo || "",
      lineItem.item,
      lineItem.description,
      String(lineItem.quantity),
      formatAmount(lineItem.rate),
      formatAmount(lineItem.amount),
      lineItem.taxable ? "Y" : "N",
      serviceDate,
      currency,
      invoice.customerEmail || "",
    ]);
  }

  // Add discount line if applicable
  if (invoice.discountAmount > 0) {
    const mappings = {
      ...DEFAULT_QB_INVOICE_MAPPINGS,
      ...options.accountMappings,
    };
    lines.push([
      invoice.invoiceNumber,
      invoice.customerName,
      invoiceDate,
      dueDate,
      `Net ${paymentTerms}`,
      "",
      "",
      mappings.discountItem,
      "Discount",
      "1",
      formatAmount(-invoice.discountAmount),
      formatAmount(-invoice.discountAmount),
      "N",
      "",
      currency,
      invoice.customerEmail || "",
    ]);
  }

  return lines;
}

/**
 * Export invoices to QuickBooks Online CSV format
 */
export function exportInvoicesToQBOnlineCSV(
  invoices: InvoiceRecord[],
  options: QBInvoiceExportOptions = {}
): string {
  const { includeHeader = true } = options;
  const allLines: string[][] = [];

  // Add header
  if (includeHeader) {
    allLines.push(QBO_INVOICE_COLUMNS);
  }

  // Generate lines for each invoice
  for (const invoice of invoices) {
    const builder = new QBInvoiceBuilder()
      .setInvoice(invoice)
      .setOptions(options);
    allLines.push(...builder.buildLines());
  }

  // Convert to CSV string
  return allLines.map((line) => line.map(escapeCSV).join(",")).join("\n");
}

/**
 * QuickBooks Desktop IIF file column headers
 */
const IIF_INVOICE_COLUMNS = [
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
  "SHIPDATE",
];

/**
 * Export invoices to QuickBooks Desktop IIF format
 */
export function exportInvoicesToIIF(
  invoices: InvoiceRecord[],
  options: QBInvoiceExportOptions = {}
): string {
  const dateFormat = options.dateFormat || "us";
  const mappings = {
    ...DEFAULT_QB_INVOICE_MAPPINGS,
    ...options.accountMappings,
  };
  const paymentTerms = options.paymentTerms ?? 30;

  const lines: string[][] = [];

  // Header row for transactions
  lines.push(IIF_INVOICE_COLUMNS);

  for (const invoice of invoices) {
    const invoiceDate = formatDateForQB(invoice.invoiceDate, dateFormat);
    const dueDate = formatDateForQB(invoice.dueDate, dateFormat);

    // Transaction header
    lines.push([
      "TRNS",
      "INVOICE",
      invoiceDate,
      "Accounts Receivable",
      invoice.customerName,
      "",
      formatAmount(-invoice.totalAmount), // Negative for AR
      invoice.invoiceNumber,
      invoice.memo || "",
      "",
      "",
      "",
      "",
      "",
      dueDate,
      `Net ${paymentTerms}`,
      "N",
      invoiceDate,
    ]);

    // Line items (income)
    for (const lineItem of invoice.lineItems) {
      lines.push([
        "SPL",
        "INVOICE",
        invoiceDate,
        mappings.incomeAccount,
        invoice.customerName,
        "",
        formatAmount(lineItem.amount), // Positive for income
        invoice.invoiceNumber,
        lineItem.description,
        String(lineItem.quantity),
        formatAmount(lineItem.rate),
        lineItem.item,
        lineItem.taxable ? "Y" : "N",
        "",
      ]);
    }

    // Discount line if applicable
    if (invoice.discountAmount > 0) {
      lines.push([
        "SPL",
        "INVOICE",
        invoiceDate,
        mappings.incomeAccount,
        invoice.customerName,
        "",
        formatAmount(-invoice.discountAmount), // Negative for discount
        invoice.invoiceNumber,
        "Discount",
        "1",
        formatAmount(-invoice.discountAmount),
        mappings.discountItem,
        "N",
        "",
      ]);
    }

    // Tax line if applicable
    if (invoice.taxAmount > 0) {
      lines.push([
        "SPL",
        "INVOICE",
        invoiceDate,
        "Sales Tax Payable",
        invoice.customerName,
        "",
        formatAmount(invoice.taxAmount),
        invoice.invoiceNumber,
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
export interface InvoiceExportResult {
  format: "qbOnlineCsv" | "iif";
  content: string;
  filename: string;
  mimeType: string;
}

/**
 * Unified export function
 */
export function exportInvoices(
  invoices: InvoiceRecord[],
  format: "qbOnlineCsv" | "iif" = "qbOnlineCsv",
  options: QBInvoiceExportOptions = {}
): InvoiceExportResult {
  const timestamp = new Date().toISOString().split("T")[0];

  if (format === "iif") {
    return {
      format: "iif",
      content: exportInvoicesToIIF(invoices, options),
      filename: `invoices-${timestamp}.iif`,
      mimeType: "text/plain",
    };
  }

  return {
    format: "qbOnlineCsv",
    content: exportInvoicesToQBOnlineCSV(invoices, options),
    filename: `invoices-${timestamp}.csv`,
    mimeType: "text/csv",
  };
}
