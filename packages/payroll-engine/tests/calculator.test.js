Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const calculator_1 = require("../src/core/calculator");
const currency_1 = require("../src/core/currency");
// Test fixtures
const testTenantId = "550e8400-e29b-41d4-a716-446655440000";
const testPeriodId = "660e8400-e29b-41d4-a716-446655440000";
function createTestEmployee(overrides = {}) {
  return {
    id: "770e8400-e29b-41d4-a716-446655440001",
    tenantId: testTenantId,
    name: "John Doe",
    department: "Kitchen",
    roleId: "880e8400-e29b-41d4-a716-446655440001",
    currency: "USD",
    hourlyRate: 20,
    taxInfo: {
      jurisdiction: "FL",
      status: "single",
      federalWithholdingAllowances: 1,
      stateWithholdingAllowances: 0,
      additionalWithholding: 0,
    },
    payrollPrefs: {
      payPeriodFrequency: "biweekly",
      roundingRule: "none",
    },
    ...overrides,
  };
}
function createTestRole(overrides = {}) {
  return {
    id: "880e8400-e29b-41d4-a716-446655440001",
    tenantId: testTenantId,
    name: "Line Cook",
    baseRate: 20,
    overtimeMultiplier: 1.5,
    overtimeThresholdHours: 40,
    ...overrides,
  };
}
function createTestTimeEntry(employeeId, hoursWorked, overrides = {}) {
  return {
    id: `entry-${Math.random().toString(36).slice(2)}`,
    tenantId: testTenantId,
    employeeId,
    date: new Date("2024-01-15"),
    hoursWorked,
    hoursRegular: Math.min(hoursWorked, 8),
    hoursOvertime: Math.max(0, hoursWorked - 8),
    approved: true,
    ...overrides,
  };
}
(0, vitest_1.describe)("Currency utilities", () => {
  (0, vitest_1.it)("should handle basic arithmetic correctly", () => {
    const a = (0, currency_1.money)(100.5);
    const b = (0, currency_1.money)(25.25);
    (0, vitest_1.expect)(a.add(b).toNumber()).toBe(125.75);
    (0, vitest_1.expect)(a.subtract(b).toNumber()).toBe(75.25);
    (0, vitest_1.expect)(a.multiply(2).toNumber()).toBe(201.0);
    (0, vitest_1.expect)(a.divide(2).toNumber()).toBe(50.25);
  });
  (0, vitest_1.it)("should calculate percentages correctly", () => {
    const amount = (0, currency_1.money)(1000);
    (0, vitest_1.expect)(amount.percentage(10).toNumber()).toBe(100);
    (0, vitest_1.expect)(amount.percentage(6.2).toNumber()).toBe(62);
    (0, vitest_1.expect)(amount.percentage(1.45).toNumber()).toBe(14.5);
  });
  (0, vitest_1.it)("should handle rounding to 2 decimal places", () => {
    const amount = (0, currency_1.money)(100.456);
    (0, vitest_1.expect)(amount.toNumber()).toBe(100.46);
    const amount2 = (0, currency_1.money)(100.444);
    (0, vitest_1.expect)(amount2.toNumber()).toBe(100.44);
  });
  (0, vitest_1.it)("should convert to cents correctly", () => {
    (0, vitest_1.expect)((0, currency_1.money)(10.99).toCents()).toBe(1099);
    (0, vitest_1.expect)((0, currency_1.money)(0.01).toCents()).toBe(1);
    (0, vitest_1.expect)((0, currency_1.money)(1000.5).toCents()).toBe(100_050);
  });
  (0, vitest_1.it)("should handle non-negative capping", () => {
    const negative = (0, currency_1.money)(-50);
    (0, vitest_1.expect)(negative.nonNegative().toNumber()).toBe(0);
    const positive = (0, currency_1.money)(50);
    (0, vitest_1.expect)(positive.nonNegative().toNumber()).toBe(50);
  });
  (0, vitest_1.it)("should cap at maximum value", () => {
    const amount = (0, currency_1.money)(1000);
    (0, vitest_1.expect)(amount.cap(500).toNumber()).toBe(500);
    (0, vitest_1.expect)(amount.cap(1500).toNumber()).toBe(1000);
  });
});
(0, vitest_1.describe)("Basic payroll calculations", () => {
  (0, vitest_1.it)("should calculate regular pay correctly", () => {
    const employee = createTestEmployee();
    const role = createTestRole({ baseRate: 25 });
    const timeEntries = [createTestTimeEntry(employee.id, 40)];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee,
      role,
      timeEntries,
      [],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40,
      1
    );
    (0, vitest_1.expect)(result.hoursRegular).toBe(40);
    (0, vitest_1.expect)(result.hoursOvertime).toBe(0);
    (0, vitest_1.expect)(result.regularPay).toBe(1000); // 40 * 25
    (0, vitest_1.expect)(result.overtimePay).toBe(0);
    (0, vitest_1.expect)(result.grossPay).toBe(1000);
  });
  (0, vitest_1.it)("should calculate overtime correctly", () => {
    const employee = createTestEmployee();
    const role = createTestRole({ baseRate: 20, overtimeMultiplier: 1.5 });
    const timeEntries = [createTestTimeEntry(employee.id, 50)];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee,
      role,
      timeEntries,
      [],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      50,
      1
    );
    (0, vitest_1.expect)(result.hoursRegular).toBe(40);
    (0, vitest_1.expect)(result.hoursOvertime).toBe(10);
    (0, vitest_1.expect)(result.regularPay).toBe(800); // 40 * 20
    (0, vitest_1.expect)(result.overtimePay).toBe(300); // 10 * 20 * 1.5
    (0, vitest_1.expect)(result.grossPay).toBe(1100);
  });
  (0, vitest_1.it)("should only include approved time entries", () => {
    const employee = createTestEmployee();
    const role = createTestRole({ baseRate: 20 });
    const timeEntries = [
      createTestTimeEntry(employee.id, 20, { approved: true }),
      createTestTimeEntry(employee.id, 20, { approved: false }),
    ];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee,
      role,
      timeEntries,
      [],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      20,
      1
    );
    // Only approved 20 hours should count
    (0, vitest_1.expect)(result.hoursRegular).toBe(20);
    (0, vitest_1.expect)(result.regularPay).toBe(400); // 20 * 20
  });
});
(0, vitest_1.describe)("Tip allocation", () => {
  (0, vitest_1.it)("should allocate tips by hours", () => {
    const employee1 = createTestEmployee({ id: "emp1", name: "Employee 1" });
    const employee2 = createTestEmployee({ id: "emp2", name: "Employee 2" });
    const role = createTestRole();
    const tipPool = {
      id: "tip1",
      tenantId: testTenantId,
      periodId: testPeriodId,
      totalTips: 1000,
      allocationRule: "by_hours",
    };
    // Employee 1 worked 30 hours, Employee 2 worked 10 hours
    const timeEntries = [
      createTestTimeEntry(employee1.id, 30),
      createTestTimeEntry(employee2.id, 10),
    ];
    const result1 = (0, calculator_1.calculateEmployeePayroll)(
      employee1,
      role,
      timeEntries,
      [tipPool],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40, // total hours
      2 // employee count
    );
    const result2 = (0, calculator_1.calculateEmployeePayroll)(
      employee2,
      role,
      timeEntries,
      [tipPool],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40,
      2
    );
    // 30/40 = 75% of tips for employee 1
    (0, vitest_1.expect)(result1.tips).toBe(750);
    // 10/40 = 25% of tips for employee 2
    (0, vitest_1.expect)(result2.tips).toBe(250);
  });
  (0, vitest_1.it)("should allocate tips by headcount", () => {
    const employee1 = createTestEmployee({ id: "emp1" });
    const employee2 = createTestEmployee({ id: "emp2" });
    const role = createTestRole();
    const tipPool = {
      id: "tip1",
      tenantId: testTenantId,
      periodId: testPeriodId,
      totalTips: 1000,
      allocationRule: "by_headcount",
    };
    const timeEntries = [
      createTestTimeEntry(employee1.id, 40),
      createTestTimeEntry(employee2.id, 20),
    ];
    const result1 = (0, calculator_1.calculateEmployeePayroll)(
      employee1,
      role,
      timeEntries,
      [tipPool],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      60,
      2
    );
    // 1000 / 2 employees = 500 each
    (0, vitest_1.expect)(result1.tips).toBe(500);
  });
  (0, vitest_1.it)("should allocate tips by fixed shares", () => {
    const employee1 = createTestEmployee({ id: "emp1" });
    const role = createTestRole();
    const tipPool = {
      id: "tip1",
      tenantId: testTenantId,
      periodId: testPeriodId,
      totalTips: 1000,
      allocationRule: "fixed_shares",
      fixedShares: {
        emp1: 60, // 60%
        emp2: 40, // 40%
      },
    };
    const timeEntries = [createTestTimeEntry(employee1.id, 40)];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee1,
      role,
      timeEntries,
      [tipPool],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40,
      2
    );
    (0, vitest_1.expect)(result.tips).toBe(600); // 60% of 1000
  });
});
(0, vitest_1.describe)("Deductions", () => {
  (0, vitest_1.it)("should apply fixed amount deductions", () => {
    const employee = createTestEmployee();
    const role = createTestRole({ baseRate: 50 }); // $2000 gross for 40 hours
    const deduction = {
      id: "ded1",
      tenantId: testTenantId,
      employeeId: employee.id,
      type: "health_insurance",
      name: "Health Insurance",
      amount: 200,
      isPreTax: true,
      effectiveDate: new Date("2024-01-01"),
    };
    const timeEntries = [createTestTimeEntry(employee.id, 40)];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee,
      role,
      timeEntries,
      [],
      [deduction],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40,
      1
    );
    (0, vitest_1.expect)(result.preTaxDeductions).toHaveLength(1);
    (0, vitest_1.expect)(result.preTaxDeductions[0].amount).toBe(200);
    (0, vitest_1.expect)(result.preTaxDeductions[0].name).toBe(
      "Health Insurance"
    );
  });
  (0, vitest_1.it)("should apply percentage deductions", () => {
    const employee = createTestEmployee();
    const role = createTestRole({ baseRate: 25 }); // $1000 gross for 40 hours
    const deduction = {
      id: "ded1",
      tenantId: testTenantId,
      employeeId: employee.id,
      type: "retirement_401k",
      name: "401(k) Contribution",
      percentage: 6, // 6% of gross
      isPreTax: true,
      effectiveDate: new Date("2024-01-01"),
    };
    const timeEntries = [createTestTimeEntry(employee.id, 40)];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee,
      role,
      timeEntries,
      [],
      [deduction],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40,
      1
    );
    (0, vitest_1.expect)(result.preTaxDeductions).toHaveLength(1);
    (0, vitest_1.expect)(result.preTaxDeductions[0].amount).toBe(60); // 6% of 1000
  });
  (0, vitest_1.it)("should separate pre-tax and post-tax deductions", () => {
    const employee = createTestEmployee();
    const role = createTestRole({ baseRate: 25 });
    const deductions = [
      {
        id: "ded1",
        tenantId: testTenantId,
        employeeId: employee.id,
        type: "health_insurance",
        name: "Health Insurance",
        amount: 100,
        isPreTax: true,
        effectiveDate: new Date("2024-01-01"),
      },
      {
        id: "ded2",
        tenantId: testTenantId,
        employeeId: employee.id,
        type: "garnishment",
        name: "Wage Garnishment",
        amount: 50,
        isPreTax: false,
        effectiveDate: new Date("2024-01-01"),
      },
    ];
    const timeEntries = [createTestTimeEntry(employee.id, 40)];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee,
      role,
      timeEntries,
      [],
      deductions,
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40,
      1
    );
    (0, vitest_1.expect)(result.preTaxDeductions).toHaveLength(1);
    (0, vitest_1.expect)(result.preTaxDeductions[0].amount).toBe(100);
    (0, vitest_1.expect)(result.postTaxDeductions).toHaveLength(1);
    (0, vitest_1.expect)(result.postTaxDeductions[0].amount).toBe(50);
  });
});
(0, vitest_1.describe)("Tax calculations", () => {
  (0, vitest_1.it)("should calculate FICA taxes", () => {
    const employee = createTestEmployee({
      taxInfo: {
        jurisdiction: "FL", // No state tax
        status: "single",
        federalWithholdingAllowances: 0,
        stateWithholdingAllowances: 0,
        additionalWithholding: 0,
      },
    });
    const role = createTestRole({ baseRate: 25 }); // $1000 gross
    const timeEntries = [createTestTimeEntry(employee.id, 40)];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee,
      role,
      timeEntries,
      [],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40,
      1
    );
    // Check for Social Security tax (6.2%)
    const ssTax = result.taxesWithheld.find(
      (t) => t.type === "social_security"
    );
    (0, vitest_1.expect)(ssTax).toBeDefined();
    (0, vitest_1.expect)(ssTax.amount).toBe(62); // 6.2% of 1000
    // Check for Medicare tax (1.45%)
    const medicareTax = result.taxesWithheld.find((t) => t.type === "medicare");
    (0, vitest_1.expect)(medicareTax).toBeDefined();
    (0, vitest_1.expect)(medicareTax.amount).toBe(14.5); // 1.45% of 1000
  });
  (0, vitest_1.it)("should calculate federal income tax", () => {
    const employee = createTestEmployee();
    const role = createTestRole({ baseRate: 25 });
    const timeEntries = [createTestTimeEntry(employee.id, 40)];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee,
      role,
      timeEntries,
      [],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40,
      1
    );
    const federalTax = result.taxesWithheld.find((t) => t.type === "federal");
    (0, vitest_1.expect)(federalTax).toBeDefined();
    (0, vitest_1.expect)(federalTax.amount).toBeGreaterThan(0);
  });
  (0, vitest_1.it)(
    "should apply state tax for applicable jurisdictions",
    () => {
      const employee = createTestEmployee({
        taxInfo: {
          jurisdiction: "CA",
          status: "single",
          federalWithholdingAllowances: 0,
          stateWithholdingAllowances: 0,
          additionalWithholding: 0,
        },
      });
      const role = createTestRole({ baseRate: 50 }); // Higher income to trigger state tax
      const timeEntries = [createTestTimeEntry(employee.id, 40)];
      const result = (0, calculator_1.calculateEmployeePayroll)(
        employee,
        role,
        timeEntries,
        [],
        [],
        testPeriodId,
        new Date("2024-01-01"),
        new Date("2024-01-14"),
        40,
        1
      );
      const stateTax = result.taxesWithheld.find((t) => t.type === "state");
      (0, vitest_1.expect)(stateTax).toBeDefined();
      (0, vitest_1.expect)(stateTax.jurisdiction).toBe("CA");
      (0, vitest_1.expect)(stateTax.amount).toBeGreaterThan(0);
    }
  );
  (0, vitest_1.it)("should not apply state tax for tax-free states", () => {
    const employee = createTestEmployee({
      taxInfo: {
        jurisdiction: "TX",
        status: "single",
        federalWithholdingAllowances: 0,
        stateWithholdingAllowances: 0,
        additionalWithholding: 0,
      },
    });
    const role = createTestRole({ baseRate: 50 });
    const timeEntries = [createTestTimeEntry(employee.id, 40)];
    const result = (0, calculator_1.calculateEmployeePayroll)(
      employee,
      role,
      timeEntries,
      [],
      [],
      testPeriodId,
      new Date("2024-01-01"),
      new Date("2024-01-14"),
      40,
      1
    );
    const stateTax = result.taxesWithheld.find((t) => t.type === "state");
    (0, vitest_1.expect)(stateTax).toBeUndefined();
  });
});
(0, vitest_1.describe)("Full payroll calculation", () => {
  (0, vitest_1.it)("should calculate payroll for multiple employees", () => {
    const employees = [
      createTestEmployee({ id: "emp1", name: "Alice" }),
      createTestEmployee({ id: "emp2", name: "Bob" }),
      createTestEmployee({ id: "emp3", name: "Charlie" }),
    ];
    const roles = [createTestRole()];
    const timeEntries = [
      createTestTimeEntry("emp1", 40),
      createTestTimeEntry("emp2", 45), // 5 hours OT
      createTestTimeEntry("emp3", 35),
    ];
    const input = {
      tenantId: testTenantId,
      periodId: testPeriodId,
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-14"),
      employees,
      roles,
      timeEntries,
      tipPools: [],
      deductions: [],
    };
    const { records, summary, warnings } = (0, calculator_1.calculatePayroll)(
      input
    );
    (0, vitest_1.expect)(records).toHaveLength(3);
    (0, vitest_1.expect)(summary.totalEmployees).toBe(3);
    (0, vitest_1.expect)(summary.totalRegularHours).toBe(115); // 40 + 40 + 35
    (0, vitest_1.expect)(summary.totalOvertimeHours).toBe(5);
    (0, vitest_1.expect)(warnings).toHaveLength(0);
  });
  (0, vitest_1.it)("should warn about missing time entries", () => {
    const employees = [
      createTestEmployee({ id: "emp1", name: "Alice" }),
      createTestEmployee({ id: "emp2", name: "Bob" }),
    ];
    const roles = [createTestRole()];
    // Only emp1 has time entries
    const timeEntries = [createTestTimeEntry("emp1", 40)];
    const input = {
      tenantId: testTenantId,
      periodId: testPeriodId,
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-14"),
      employees,
      roles,
      timeEntries,
      tipPools: [],
      deductions: [],
    };
    const { warnings } = (0, calculator_1.calculatePayroll)(input);
    (0, vitest_1.expect)(warnings).toHaveLength(1);
    (0, vitest_1.expect)(warnings[0]).toContain("Bob");
    (0, vitest_1.expect)(warnings[0]).toContain("no approved time entries");
  });
  (0, vitest_1.it)("should warn about missing role assignments", () => {
    const employees = [
      createTestEmployee({ id: "emp1", roleId: "missing-role" }),
    ];
    const roles = [createTestRole()]; // Different role ID
    const timeEntries = [createTestTimeEntry("emp1", 40)];
    const input = {
      tenantId: testTenantId,
      periodId: testPeriodId,
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-14"),
      employees,
      roles,
      timeEntries,
      tipPools: [],
      deductions: [],
    };
    const { records, warnings } = (0, calculator_1.calculatePayroll)(input);
    (0, vitest_1.expect)(records).toHaveLength(0);
    (0, vitest_1.expect)(warnings).toHaveLength(1);
    (0, vitest_1.expect)(warnings[0]).toContain("no valid role");
  });
});
(0, vitest_1.describe)("Payroll balance verification", () => {
  (0, vitest_1.it)(
    "should validate that gross - taxes - deductions = net",
    () => {
      const employees = [createTestEmployee()];
      const roles = [createTestRole({ baseRate: 25 })];
      const timeEntries = [createTestTimeEntry(employees[0].id, 40)];
      const deductions = [
        {
          id: "ded1",
          tenantId: testTenantId,
          employeeId: employees[0].id,
          type: "health_insurance",
          name: "Health Insurance",
          amount: 100,
          isPreTax: true,
          effectiveDate: new Date("2024-01-01"),
        },
      ];
      const input = {
        tenantId: testTenantId,
        periodId: testPeriodId,
        periodStart: new Date("2024-01-01"),
        periodEnd: new Date("2024-01-14"),
        employees,
        roles,
        timeEntries,
        tipPools: [],
        deductions,
      };
      const { records } = (0, calculator_1.calculatePayroll)(input);
      const validation = (0, calculator_1.verifyPayrollBalances)(records);
      (0, vitest_1.expect)(validation.isValid).toBe(true);
      (0, vitest_1.expect)(validation.discrepancies).toHaveLength(0);
    }
  );
});
(0, vitest_1.describe)("Idempotency", () => {
  (0, vitest_1.it)(
    "should generate same record ID for same period and employee",
    () => {
      const employees = [createTestEmployee()];
      const roles = [createTestRole()];
      const timeEntries = [createTestTimeEntry(employees[0].id, 40)];
      const input = {
        tenantId: testTenantId,
        periodId: testPeriodId,
        periodStart: new Date("2024-01-01"),
        periodEnd: new Date("2024-01-14"),
        employees,
        roles,
        timeEntries,
      };
      const result1 = (0, calculator_1.calculatePayroll)(input);
      const result2 = (0, calculator_1.calculatePayroll)(input);
      (0, vitest_1.expect)(result1.records[0].id).toBe(result2.records[0].id);
    }
  );
});
