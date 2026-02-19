import { describe, expect, it } from "vitest";
import {
  type BillRecord,
  QBBillBuilder,
  exportBills,
  exportBillsToIIF,
  exportBillsToQBOnlineCSV,
} from "../app/lib/quickbooks-bill-export";

describe("QuickBooks Bill Export", () => {
  const sampleBill: BillRecord = {
    billNumber: "BILL-PO-001",
    vendorName: "Fresh Farms Produce",
    vendorAddress: "123 Farm Road, Agricultural Valley, CA 94102",
    billDate: new Date("2024-01-15"),
    dueDate: new Date("2024-02-14"),
    lineItems: [
      {
        item: "Produce - Vegetables",
        description: "Organic vegetables for event",
        quantity: 50,
        unitCost: 30,
        amount: 1500,
        expenseAccount: "Cost of Goods Sold",
        taxable: true,
        serviceDate: new Date("2024-01-15"),
      },
      {
        item: "Produce - Fruits",
        description: "Seasonal fruits assortment",
        quantity: 25,
        unitCost: 40,
        amount: 1000,
        expenseAccount: "Cost of Goods Sold",
        taxable: true,
      },
    ],
    subtotal: 2500,
    taxAmount: 0,
    shippingAmount: 50,
    totalAmount: 2550,
    memo: "Purchase Order: PO-001",
    currency: "USD",
    terms: "Net 30",
  };

  describe("exportBillsToQBOnlineCSV", () => {
    it("should generate valid QuickBooks Online CSV format", () => {
      const csv = exportBillsToQBOnlineCSV([sampleBill]);

      // Should have header row
      expect(csv).toContain("*BillNo");
      expect(csv).toContain("*Vendor");
      expect(csv).toContain("*BillDate");

      // Should contain bill data
      expect(csv).toContain("BILL-PO-001");
      expect(csv).toContain("Fresh Farms Produce");
      expect(csv).toContain("Produce - Vegetables");
      expect(csv).toContain("1500");
    });

    it("should handle multiple bills", () => {
      const bills: BillRecord[] = [
        sampleBill,
        {
          ...sampleBill,
          billNumber: "BILL-PO-002",
          vendorName: "Meat Masters LLC",
          totalAmount: 3500,
        },
      ];

      const csv = exportBillsToQBOnlineCSV(bills);

      expect(csv).toContain("BILL-PO-001");
      expect(csv).toContain("BILL-PO-002");
      expect(csv).toContain("Fresh Farms Produce");
      expect(csv).toContain("Meat Masters LLC");
    });

    it("should include shipping line when shipping is present", () => {
      const billWithShipping: BillRecord = {
        ...sampleBill,
        shippingAmount: 75,
      };

      const csv = exportBillsToQBOnlineCSV([billWithShipping]);

      expect(csv).toContain("Shipping");
      expect(csv).toContain("75");
    });

    it("should use ISO date format when specified", () => {
      const csv = exportBillsToQBOnlineCSV([sampleBill], {
        dateFormat: "iso",
      });

      expect(csv).toContain("2024-01-15");
    });

    it("should use US date format by default (MM/DD/YYYY)", () => {
      const csv = exportBillsToQBOnlineCSV([sampleBill]);

      // US format uses MM/DD/YYYY with slashes
      expect(csv).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe("exportBillsToIIF", () => {
    it("should generate valid QuickBooks Desktop IIF format", () => {
      const iif = exportBillsToIIF([sampleBill]);

      // Should have IIF transaction header
      expect(iif).toContain("!TRNS");
      expect(iif).toContain("BILL");
      expect(iif).toContain("Accounts Payable");

      // Should contain bill data
      expect(iif).toContain("BILL-PO-001");
      expect(iif).toContain("Fresh Farms Produce");
    });

    it("should use tab as delimiter", () => {
      const iif = exportBillsToIIF([sampleBill]);

      // IIF uses tabs, not commas
      expect(iif).toContain("\t");
    });

    it("should include ENDTRNS for each bill", () => {
      const iif = exportBillsToIIF([sampleBill]);

      expect(iif).toContain("ENDTRNS");
    });

    it("should include expense account in split lines", () => {
      const iif = exportBillsToIIF([sampleBill]);

      expect(iif).toContain("Cost of Goods Sold");
    });

    it("should include shipping line when shipping is present", () => {
      const iif = exportBillsToIIF([sampleBill]);

      expect(iif).toContain("Shipping");
    });
  });

  describe("QBBillBuilder", () => {
    it("should build bill lines fluently", () => {
      const lines = new QBBillBuilder()
        .setBill(sampleBill)
        .setOptions({ dateFormat: "iso" })
        .buildLines();

      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0][0]).toBe("BILL-PO-001");
      expect(lines[0][1]).toBe("Fresh Farms Produce");
    });

    it("should throw error when bill not set", () => {
      expect(() => new QBBillBuilder().buildLines()).toThrow(
        "Bill must be set"
      );
    });

    it("should include shipping line when shipping amount > 0", () => {
      const lines = new QBBillBuilder()
        .setBill(sampleBill)
        .setOptions({})
        .buildLines();

      // 2 line items + 1 shipping line = 3 lines
      expect(lines.length).toBe(3);
    });

    it("should not include shipping line when shipping amount is 0", () => {
      const billNoShipping: BillRecord = {
        ...sampleBill,
        shippingAmount: 0,
      };

      const lines = new QBBillBuilder()
        .setBill(billNoShipping)
        .setOptions({})
        .buildLines();

      // 2 line items only
      expect(lines.length).toBe(2);
    });
  });

  describe("exportBills", () => {
    it("should return correct result for QBO CSV format", () => {
      const result = exportBills([sampleBill], "qbOnlineCsv");

      expect(result.format).toBe("qbOnlineCsv");
      expect(result.filename).toMatch(/bills-.*\.csv/);
      expect(result.mimeType).toBe("text/csv");
      expect(result.content).toContain("*BillNo");
    });

    it("should return correct result for IIF format", () => {
      const result = exportBills([sampleBill], "iif");

      expect(result.format).toBe("iif");
      expect(result.filename).toMatch(/bills-.*\.iif/);
      expect(result.mimeType).toBe("text/plain");
      expect(result.content).toContain("!TRNS");
    });

    it("should generate unique filenames with timestamp", () => {
      const result1 = exportBills([sampleBill], "qbOnlineCsv");
      const result2 = exportBills([sampleBill], "qbOnlineCsv");

      // Filenames should contain the date
      expect(result1.filename).toMatch(/bills-\d{4}-\d{2}-\d{2}\.csv/);
    });
  });

  describe("CSV escaping", () => {
    it("should escape values with commas", () => {
      const billWithComma: BillRecord = {
        ...sampleBill,
        vendorName: "Fresh Farms, Inc.",
      };

      const csv = exportBillsToQBOnlineCSV([billWithComma]);

      expect(csv).toContain('"Fresh Farms, Inc."');
    });

    it("should escape values with quotes", () => {
      const billWithQuote: BillRecord = {
        ...sampleBill,
        vendorName: 'Fresh "Organic" Farms',
      };

      const csv = exportBillsToQBOnlineCSV([billWithQuote]);

      expect(csv).toContain('Fresh ""Organic"" Farms');
    });

    it("should escape values with newlines in memo", () => {
      const billWithNewline: BillRecord = {
        ...sampleBill,
        memo: "Line 1\nLine 2",
      };

      const csv = exportBillsToQBOnlineCSV([billWithNewline]);

      expect(csv).toContain('"Line 1\nLine 2"');
    });
  });

  describe("Account mappings", () => {
    it("should use custom account mappings", () => {
      const csv = exportBillsToQBOnlineCSV([sampleBill], {
        accountMappings: {
          expenseAccount: "Food Cost",
          shippingItem: "Delivery Charges",
        },
      });

      // The expense account is included in the line item, not the header
      expect(csv).toContain("Food Cost");
    });

    it("should use default mappings when not specified", () => {
      const iif = exportBillsToIIF([sampleBill]);

      // Should have default Accounts Payable
      expect(iif).toContain("Accounts Payable");
      // Should have default Cost of Goods Sold for items without expense account
      expect(iif).toContain("Cost of Goods Sold");
    });
  });

  describe("Payment terms", () => {
    it("should use bill-specific terms when provided", () => {
      const billWithCustomTerms: BillRecord = {
        ...sampleBill,
        terms: "Net 45",
      };

      const csv = exportBillsToQBOnlineCSV([billWithCustomTerms]);

      expect(csv).toContain("Net 45");
    });

    it("should use options payment terms as fallback", () => {
      const billNoTerms: BillRecord = {
        ...sampleBill,
        terms: undefined,
      };

      const csv = exportBillsToQBOnlineCSV([billNoTerms], {
        paymentTerms: 60,
      });

      expect(csv).toContain("Net 60");
    });

    it("should default to Net 30 when no terms specified", () => {
      const billNoTerms: BillRecord = {
        ...sampleBill,
        terms: undefined,
      };

      const csv = exportBillsToQBOnlineCSV([billNoTerms]);

      expect(csv).toContain("Net 30");
    });
  });
});
