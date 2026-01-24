Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const exporters_1 = require("../src/exporters");
// Test fixtures
const testTenantId = "550e8400-e29b-41d4-a716-446655440000";
const testPeriodId = "660e8400-e29b-41d4-a716-446655440000";
function createTestPeriod() {
  return {
    id: testPeriodId,
    tenantId: testTenantId,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-14"),
    status: "completed",
    currency: "USD",
  };
}
function createTestRecord(overrides = {}) {
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
(0, vitest_1.describe)("CSV Export", () => {
  (0, vitest_1.it)("should export records to CSV format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const csv = (0, exporters_1.exportToCSV)(records, period);
    (0, vitest_1.expect)(csv).toContain("EmployeeID");
    (0, vitest_1.expect)(csv).toContain("Name");
    (0, vitest_1.expect)(csv).toContain("John Doe");
    (0, vitest_1.expect)(csv).toContain("Kitchen");
    (0, vitest_1.expect)(csv).toContain("Line Cook");
    (0, vitest_1.expect)(csv).toContain("40.00"); // Regular hours
    (0, vitest_1.expect)(csv).toContain("5.00"); // OT hours
    (0, vitest_1.expect)(csv).toContain("800.00"); // Regular pay
    (0, vitest_1.expect)(csv).toContain("1050.00"); // Gross pay
    (0, vitest_1.expect)(csv).toContain("698.42"); // Net pay
  });
  (0, vitest_1.it)("should respect header option", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const csvWithHeader = (0, exporters_1.exportToCSV)(records, period, {
      includeHeader: true,
    });
    const csvNoHeader = (0, exporters_1.exportToCSV)(records, period, {
      includeHeader: false,
    });
    (0, vitest_1.expect)(csvWithHeader.split("\n")).toHaveLength(2); // Header + 1 record
    (0, vitest_1.expect)(csvNoHeader.split("\n")).toHaveLength(1); // Just 1 record
  });
  (0, vitest_1.it)("should use custom delimiter", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const csv = (0, exporters_1.exportToCSV)(records, period, {
      delimiter: ";",
    });
    (0, vitest_1.expect)(csv).toContain(";");
    (0, vitest_1.expect)(csv.split(";").length).toBeGreaterThan(5);
  });
  (0, vitest_1.it)("should mask sensitive data when requested", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const csv = (0, exporters_1.exportToCSV)(records, period, {
      maskSensitiveData: true,
    });
    (0, vitest_1.expect)(csv).toContain("****");
    (0, vitest_1.expect)(csv).not.toContain("emp-001");
  });
  (0, vitest_1.it)("should escape fields with special characters", () => {
    const period = createTestPeriod();
    const records = [createTestRecord({ employeeName: 'Doe, John "Johnny"' })];
    const csv = (0, exporters_1.exportToCSV)(records, period);
    // Field with comma and quotes should be escaped
    (0, vitest_1.expect)(csv).toContain('"Doe, John ""Johnny"""');
  });
});
(0, vitest_1.describe)("QBXML Export", () => {
  (0, vitest_1.it)("should export records to QBXML format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const xml = (0, exporters_1.exportToQBXML)(records, period);
    (0, vitest_1.expect)(xml).toContain('<?xml version="1.0"');
    (0, vitest_1.expect)(xml).toContain("<?qbxml version=");
    (0, vitest_1.expect)(xml).toContain("<QBXML>");
    (0, vitest_1.expect)(xml).toContain("<QBXMLMsgsRq");
    (0, vitest_1.expect)(xml).toContain("<JournalEntryAdd>");
    (0, vitest_1.expect)(xml).toContain("<AccountRef>");
    (0, vitest_1.expect)(xml).toContain("Payroll Expenses:Wages");
  });
  (0, vitest_1.it)("should include debit and credit lines", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const xml = (0, exporters_1.exportToQBXML)(records, period);
    // Debits (expenses)
    (0, vitest_1.expect)(xml).toContain("<JournalDebitLine>");
    (0, vitest_1.expect)(xml).toContain("800.00"); // Regular pay
    // Credits (liabilities/cash)
    (0, vitest_1.expect)(xml).toContain("<JournalCreditLine>");
    (0, vitest_1.expect)(xml).toContain("698.42"); // Net pay
  });
  (0, vitest_1.it)("should properly escape XML special characters", () => {
    const period = createTestPeriod();
    const records = [createTestRecord({ employeeName: "O'Brien & Smith" })];
    const xml = (0, exporters_1.exportToQBXML)(records, period);
    (0, vitest_1.expect)(xml).toContain("O&apos;Brien &amp; Smith");
  });
  (0, vitest_1.it)("should create aggregate journal entry", () => {
    const period = createTestPeriod();
    const records = [
      createTestRecord({ id: "rec-001", employeeId: "emp-001" }),
      createTestRecord({
        id: "rec-002",
        employeeId: "emp-002",
        employeeName: "Jane Doe",
      }),
    ];
    const xml = (0, exporters_1.exportToQBXMLAggregate)(records, period);
    // Should only have one JournalEntryAdd
    const journalEntryCount = (xml.match(/<JournalEntryAdd>/g) || []).length;
    (0, vitest_1.expect)(journalEntryCount).toBe(1);
    // Should mention multiple employees
    (0, vitest_1.expect)(xml).toContain("2 employees");
  });
});
(0, vitest_1.describe)("QuickBooks Online CSV Export", () => {
  (0, vitest_1.it)("should export records to QBO CSV format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const csv = (0, exporters_1.exportToQBOnlineCSV)(records, period);
    (0, vitest_1.expect)(csv).toContain("*JournalNo");
    (0, vitest_1.expect)(csv).toContain("*JournalDate");
    (0, vitest_1.expect)(csv).toContain("*Currency");
    (0, vitest_1.expect)(csv).toContain("*AccountName");
    (0, vitest_1.expect)(csv).toContain("Debits");
    (0, vitest_1.expect)(csv).toContain("Credits");
  });
  (0, vitest_1.it)("should include proper debit and credit amounts", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const csv = (0, exporters_1.exportToQBOnlineCSV)(records, period);
    const lines = csv.split("\n");
    // Find a line with regular pay (debit)
    const regularPayLine = lines.find((l) => l.includes("Regular pay"));
    (0, vitest_1.expect)(regularPayLine).toContain("800.00");
    // Find a line with net pay (credit)
    const netPayLine = lines.find((l) => l.includes("Net pay"));
    (0, vitest_1.expect)(netPayLine).toContain("698.42");
  });
  (0, vitest_1.it)("should use US date format by default", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const csv = (0, exporters_1.exportToQBOnlineCSV)(records, period, {
      dateFormat: "us",
    });
    // Period end date is 2024-01-14, US format could be 1/14/2024 or 1/13/2024 depending on timezone
    // Just check that the format is correct (M/D/YYYY)
    (0, vitest_1.expect)(csv).toMatch(/\d{1,2}\/\d{1,2}\/2024/);
  });
  (0, vitest_1.it)("should create aggregate entry", () => {
    const period = createTestPeriod();
    const records = [
      createTestRecord({ regularPay: 800, grossPay: 1050 }),
      createTestRecord({ regularPay: 600, grossPay: 850 }),
    ];
    const csv = (0, exporters_1.exportToQBOnlineCSVAggregate)(records, period);
    // Check for aggregated regular pay (800 + 600 = 1400)
    (0, vitest_1.expect)(csv).toContain("1400.00");
  });
});
(0, vitest_1.describe)("Universal Export Function", () => {
  (0, vitest_1.it)("should export to CSV format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const result = (0, exporters_1.exportPayroll)(records, period, {
      format: "csv",
    });
    (0, vitest_1.expect)(result.format).toBe("csv");
    (0, vitest_1.expect)(result.mimeType).toBe("text/csv");
    (0, vitest_1.expect)(result.filename).toContain(".csv");
    (0, vitest_1.expect)(result.content).toContain("EmployeeID");
  });
  (0, vitest_1.it)("should export to QBXML format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const result = (0, exporters_1.exportPayroll)(records, period, {
      format: "qbxml",
    });
    (0, vitest_1.expect)(result.format).toBe("qbxml");
    (0, vitest_1.expect)(result.mimeType).toBe("application/xml");
    (0, vitest_1.expect)(result.filename).toContain(".qbxml");
    (0, vitest_1.expect)(result.content).toContain("<?xml");
  });
  (0, vitest_1.it)("should export to QBO CSV format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const result = (0, exporters_1.exportPayroll)(records, period, {
      format: "qbOnlineCsv",
    });
    (0, vitest_1.expect)(result.format).toBe("qbOnlineCsv");
    (0, vitest_1.expect)(result.mimeType).toBe("text/csv");
    (0, vitest_1.expect)(result.filename).toContain("qbo");
    (0, vitest_1.expect)(result.content).toContain("*JournalNo");
  });
  (0, vitest_1.it)("should export to JSON format", () => {
    const period = createTestPeriod();
    const records = [createTestRecord()];
    const result = (0, exporters_1.exportPayroll)(records, period, {
      format: "json",
    });
    (0, vitest_1.expect)(result.format).toBe("json");
    (0, vitest_1.expect)(result.mimeType).toBe("application/json");
    (0, vitest_1.expect)(result.filename).toContain(".json");
    const parsed = JSON.parse(result.content);
    (0, vitest_1.expect)(parsed.period).toBeDefined();
    (0, vitest_1.expect)(parsed.records).toHaveLength(1);
    (0, vitest_1.expect)(parsed.generatedAt).toBeDefined();
  });
  (0, vitest_1.it)("should use aggregate mode for QB exports", () => {
    const period = createTestPeriod();
    const records = [createTestRecord(), createTestRecord()];
    const result = (0, exporters_1.exportPayroll)(records, period, {
      format: "qbxml",
      aggregate: true,
    });
    (0, vitest_1.expect)(result.filename).toContain("aggregate");
    // Should have only one journal entry
    const journalCount = (result.content.match(/<JournalEntryAdd>/g) || [])
      .length;
    (0, vitest_1.expect)(journalCount).toBe(1);
  });
});
