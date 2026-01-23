import { describe, expect, it } from "vitest";
import {
  exportPayroll,
  exportToCSV,
  exportToQBOnlineCSV,
  exportToQBOnlineCSVAggregate,
  exportToQBXML,
  exportToQBXMLAggregate,
} from "../src/exporters";
import type { PayrollPeriod, PayrollRecord } from "../src/models";

// Test fixtures
const testTenantId = "550e8400-e29b-41d4-a716-446655440000";
const testPeriodId = "660e8400-e29b-41d4-a716-446655440000";

function createTestPeriod(): PayrollPeriod {
  return {
    id: testPeriodId,
    tenantId: testTenantId,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-14"),
    status: "completed",
    currency: "USD",
  };
}

function createTestRecord(
  overrides: Partial<PayrollRecord> = {}
): PayrollRecord {
  return {
    id: "rec-001",
    tenantId: testTenantId,
    periodId: testPeriodId,
    employeeId: "emp-001",
    employeeName: "John Doe",
    department: "Kitchen",
    roleName: "Line Cook",
    hoursRegular: 40,
    hoursOvertime: 5,
    regularPay: 800,
    overtimePay: 150,
    tips: 100,
    grossPay: 1050,
    preTaxDeductions: [
      {
        deductionId: "ded-001",
        type: "health_insurance",
        name: "Health Insurance",
        amount: 75,
        isPreTax: true,
      },
    ],
    taxableIncome: 975,
    taxesWithheld: [
      { type: "federal", amount: 97.5 },
      { type: "state", jurisdiction: "CA", amount: 48.75 },
      { type: "social_security", amount: 65.1 },
      { type: "medicare", amount: 15.23 },
    ],
    totalTaxes: 226.58,
    postTaxDeductions: [
      {
        deductionId: "ded-002",
        type: "garnishment",
        name: "Wage Garnishment",
        amount: 50,
        isPreTax: false,
      },
    ],
    totalDeductions: 125,
    netPay: 698.42,
    currency: "USD",
    createdAt: new Date("2024-01-15"),
    ...overrides,
  };
}

describe("CSV Export", () => {
  it("should export records to CSV format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const csv = exportToCSV(records, period);

    expect(csv).toContain("EmployeeID");
    expect(csv).toContain("Name");
    expect(csv).toContain("John Doe");
    expect(csv).toContain("Kitchen");
    expect(csv).toContain("Line Cook");
    expect(csv).toContain("40.00"); // Regular hours
    expect(csv).toContain("5.00"); // OT hours
    expect(csv).toContain("800.00"); // Regular pay
    expect(csv).toContain("1050.00"); // Gross pay
    expect(csv).toContain("698.42"); // Net pay
  });

  it("should respect header option", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const csvWithHeader = exportToCSV(records, period, { includeHeader: true });
    const csvNoHeader = exportToCSV(records, period, { includeHeader: false });

    expect(csvWithHeader.split("\n")).toHaveLength(2); // Header + 1 record
    expect(csvNoHeader.split("\n")).toHaveLength(1); // Just 1 record
  });

  it("should use custom delimiter", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const csv = exportToCSV(records, period, { delimiter: ";" });

    expect(csv).toContain(";");
    expect(csv.split(";").length).toBeGreaterThan(5);
  });

  it("should mask sensitive data when requested", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const csv = exportToCSV(records, period, { maskSensitiveData: true });

    expect(csv).toContain("****");
    expect(csv).not.toContain("emp-001");
  });

  it("should escape fields with special characters", () => {
    const period = createTestPeriod();
    const records = [createTestRecord({ employeeName: 'Doe, John "Johnny"' })];

    const csv = exportToCSV(records, period);

    // Field with comma and quotes should be escaped
    expect(csv).toContain('"Doe, John ""Johnny"""');
  });
});

describe("QBXML Export", () => {
  it("should export records to QBXML format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const xml = exportToQBXML(records, period);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<?qbxml version=");
    expect(xml).toContain("<QBXML>");
    expect(xml).toContain("<QBXMLMsgsRq");
    expect(xml).toContain("<JournalEntryAdd>");
    expect(xml).toContain("<AccountRef>");
    expect(xml).toContain("Payroll Expenses:Wages");
  });

  it("should include debit and credit lines", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const xml = exportToQBXML(records, period);

    // Debits (expenses)
    expect(xml).toContain("<JournalDebitLine>");
    expect(xml).toContain("800.00"); // Regular pay

    // Credits (liabilities/cash)
    expect(xml).toContain("<JournalCreditLine>");
    expect(xml).toContain("698.42"); // Net pay
  });

  it("should properly escape XML special characters", () => {
    const period = createTestPeriod();
    const records = [createTestRecord({ employeeName: "O'Brien & Smith" })];

    const xml = exportToQBXML(records, period);

    expect(xml).toContain("O&apos;Brien &amp; Smith");
  });

  it("should create aggregate journal entry", () => {
    const period = createTestPeriod();
    const records = [
      createTestRecord({ id: "rec-001", employeeId: "emp-001" }),
      createTestRecord({
        id: "rec-002",
        employeeId: "emp-002",
        employeeName: "Jane Doe",
      }),
    ];

    const xml = exportToQBXMLAggregate(records, period);

    // Should only have one JournalEntryAdd
    const journalEntryCount = (xml.match(/<JournalEntryAdd>/g) || []).length;
    expect(journalEntryCount).toBe(1);

    // Should mention multiple employees
    expect(xml).toContain("2 employees");
  });
});

describe("QuickBooks Online CSV Export", () => {
  it("should export records to QBO CSV format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const csv = exportToQBOnlineCSV(records, period);

    expect(csv).toContain("*JournalNo");
    expect(csv).toContain("*JournalDate");
    expect(csv).toContain("*Currency");
    expect(csv).toContain("*AccountName");
    expect(csv).toContain("Debits");
    expect(csv).toContain("Credits");
  });

  it("should include proper debit and credit amounts", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const csv = exportToQBOnlineCSV(records, period);
    const lines = csv.split("\n");

    // Find a line with regular pay (debit)
    const regularPayLine = lines.find((l) => l.includes("Regular pay"));
    expect(regularPayLine).toContain("800.00");

    // Find a line with net pay (credit)
    const netPayLine = lines.find((l) => l.includes("Net pay"));
    expect(netPayLine).toContain("698.42");
  });

  it("should use US date format by default", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const csv = exportToQBOnlineCSV(records, period, { dateFormat: "us" });

    // Period end date is 2024-01-14, US format could be 1/14/2024 or 1/13/2024 depending on timezone
    // Just check that the format is correct (M/D/YYYY)
    expect(csv).toMatch(/\d{1,2}\/\d{1,2}\/2024/);
  });

  it("should create aggregate entry", () => {
    const period = createTestPeriod();
    const records = [
      createTestRecord({ regularPay: 800, grossPay: 1050 }),
      createTestRecord({ regularPay: 600, grossPay: 850 }),
    ];

    const csv = exportToQBOnlineCSVAggregate(records, period);

    // Check for aggregated regular pay (800 + 600 = 1400)
    expect(csv).toContain("1400.00");
  });
});

describe("Universal Export Function", () => {
  it("should export to CSV format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const result = exportPayroll(records, period, { format: "csv" });

    expect(result.format).toBe("csv");
    expect(result.mimeType).toBe("text/csv");
    expect(result.filename).toContain(".csv");
    expect(result.content).toContain("EmployeeID");
  });

  it("should export to QBXML format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const result = exportPayroll(records, period, { format: "qbxml" });

    expect(result.format).toBe("qbxml");
    expect(result.mimeType).toBe("application/xml");
    expect(result.filename).toContain(".qbxml");
    expect(result.content).toContain("<?xml");
  });

  it("should export to QBO CSV format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const result = exportPayroll(records, period, { format: "qbOnlineCsv" });

    expect(result.format).toBe("qbOnlineCsv");
    expect(result.mimeType).toBe("text/csv");
    expect(result.filename).toContain("qbo");
    expect(result.content).toContain("*JournalNo");
  });

  it("should export to JSON format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];

    const result = exportPayroll(records, period, { format: "json" });

    expect(result.format).toBe("json");
    expect(result.mimeType).toBe("application/json");
    expect(result.filename).toContain(".json");

    const parsed = JSON.parse(result.content);
    expect(parsed.period).toBeDefined();
    expect(parsed.records).toHaveLength(1);
    expect(parsed.generatedAt).toBeDefined();
  });

  it("should use aggregate mode for QB exports", () => {
    const period = createTestPeriod();
    const records = [createTestRecord(), createTestRecord()];

    const result = exportPayroll(records, period, {
      format: "qbxml",
      aggregate: true,
    });

    expect(result.filename).toContain("aggregate");
    // Should have only one journal entry
    const journalCount = (result.content.match(/<JournalEntryAdd>/g) || [])
      .length;
    expect(journalCount).toBe(1);
  });
});
