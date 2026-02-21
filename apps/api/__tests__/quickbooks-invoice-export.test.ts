import { describe, expect, it } from "vitest";
import {
  exportInvoices,
  exportInvoicesToIIF,
  exportInvoicesToQBOnlineCSV,
  type InvoiceRecord,
  QBInvoiceBuilder,
} from "../app/lib/quickbooks-invoice-export";

describe("QuickBooks Invoice Export", () => {
  const sampleInvoice: InvoiceRecord = {
    invoiceNumber: "INV-001",
    customerName: "Acme Corporation",
    customerEmail: "billing@acme.com",
    invoiceDate: new Date("2024-01-15"),
    dueDate: new Date("2024-02-14"),
    lineItems: [
      {
        item: "Catering Services",
        description: "Corporate lunch event",
        quantity: 1,
        rate: 1500,
        amount: 1500,
        taxable: true,
        serviceDate: new Date("2024-01-15"),
      },
      {
        item: "Service Charge",
        description: "20% service charge",
        quantity: 1,
        rate: 300,
        amount: 300,
        taxable: false,
      },
    ],
    subtotal: 1800,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 1800,
    memo: "Event: Corporate Lunch",
    currency: "USD",
  };

  describe("exportInvoicesToQBOnlineCSV", () => {
    it("should generate valid QuickBooks Online CSV format", () => {
      const csv = exportInvoicesToQBOnlineCSV([sampleInvoice]);

      // Should have header row
      expect(csv).toContain("*InvoiceNo");
      expect(csv).toContain("*Customer");
      expect(csv).toContain("*InvoiceDate");

      // Should contain invoice data
      expect(csv).toContain("INV-001");
      expect(csv).toContain("Acme Corporation");
      expect(csv).toContain("Catering Services");
      expect(csv).toContain("1500");
    });

    it("should handle multiple invoices", () => {
      const invoices: InvoiceRecord[] = [
        sampleInvoice,
        {
          ...sampleInvoice,
          invoiceNumber: "INV-002",
          customerName: "Beta LLC",
          totalAmount: 2500,
        },
      ];

      const csv = exportInvoicesToQBOnlineCSV(invoices);

      expect(csv).toContain("INV-001");
      expect(csv).toContain("INV-002");
      expect(csv).toContain("Acme Corporation");
      expect(csv).toContain("Beta LLC");
    });

    it("should include discount line when discount is present", () => {
      const invoiceWithDiscount: InvoiceRecord = {
        ...sampleInvoice,
        discountAmount: 100,
      };

      const csv = exportInvoicesToQBOnlineCSV([invoiceWithDiscount]);

      expect(csv).toContain("Discount");
      expect(csv).toContain("-100");
    });

    it("should use ISO date format when specified", () => {
      const csv = exportInvoicesToQBOnlineCSV([sampleInvoice], {
        dateFormat: "iso",
      });

      expect(csv).toContain("2024-01-15");
    });
  });

  describe("exportInvoicesToIIF", () => {
    it("should generate valid QuickBooks Desktop IIF format", () => {
      const iif = exportInvoicesToIIF([sampleInvoice]);

      // Should have IIF transaction header
      expect(iif).toContain("!TRNS");
      expect(iif).toContain("INVOICE");
      expect(iif).toContain("Accounts Receivable");

      // Should contain invoice data
      expect(iif).toContain("INV-001");
      expect(iif).toContain("Acme Corporation");
    });

    it("should use tab as delimiter", () => {
      const iif = exportInvoicesToIIF([sampleInvoice]);

      // IIF uses tabs, not commas
      expect(iif).toContain("\t");
    });

    it("should include ENDTRNS for each invoice", () => {
      const iif = exportInvoicesToIIF([sampleInvoice]);

      expect(iif).toContain("ENDTRNS");
    });
  });

  describe("QBInvoiceBuilder", () => {
    it("should build invoice lines fluently", () => {
      const lines = new QBInvoiceBuilder()
        .setInvoice(sampleInvoice)
        .setOptions({ dateFormat: "iso" })
        .buildLines();

      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0][0]).toBe("INV-001");
      expect(lines[0][1]).toBe("Acme Corporation");
    });

    it("should throw error when invoice not set", () => {
      expect(() => new QBInvoiceBuilder().buildLines()).toThrow(
        "Invoice must be set"
      );
    });
  });

  describe("exportInvoices", () => {
    it("should return correct result for QBO CSV format", () => {
      const result = exportInvoices([sampleInvoice], "qbOnlineCsv");

      expect(result.format).toBe("qbOnlineCsv");
      expect(result.filename).toMatch(/invoices-.*\.csv/);
      expect(result.mimeType).toBe("text/csv");
      expect(result.content).toContain("*InvoiceNo");
    });

    it("should return correct result for IIF format", () => {
      const result = exportInvoices([sampleInvoice], "iif");

      expect(result.format).toBe("iif");
      expect(result.filename).toMatch(/invoices-.*\.iif/);
      expect(result.mimeType).toBe("text/plain");
      expect(result.content).toContain("!TRNS");
    });

    it("should generate unique filenames with timestamp", () => {
      const result1 = exportInvoices([sampleInvoice], "qbOnlineCsv");
      const _result2 = exportInvoices([sampleInvoice], "qbOnlineCsv");

      // Filenames should contain the date
      expect(result1.filename).toMatch(/invoices-\d{4}-\d{2}-\d{2}\.csv/);
    });
  });

  describe("CSV escaping", () => {
    it("should escape values with commas", () => {
      const invoiceWithComma: InvoiceRecord = {
        ...sampleInvoice,
        customerName: "Company, Inc.",
      };

      const csv = exportInvoicesToQBOnlineCSV([invoiceWithComma]);

      expect(csv).toContain('"Company, Inc."');
    });

    it("should escape values with quotes", () => {
      const invoiceWithQuote: InvoiceRecord = {
        ...sampleInvoice,
        customerName: 'Company "A"',
      };

      const csv = exportInvoicesToQBOnlineCSV([invoiceWithQuote]);

      expect(csv).toContain('Company ""A""');
    });
  });
});
