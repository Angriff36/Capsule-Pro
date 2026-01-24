import type {
  Deduction,
  Employee,
  PayrollCalculationInput,
  PayrollRecord,
  Role,
  TimeEntryInput,
  TipPool,
} from "../models";
/**
 * Calculate payroll for a single employee
 */
export declare function calculateEmployeePayroll(
  employee: Employee,
  role: Role,
  timeEntries: TimeEntryInput[],
  tipPools: TipPool[],
  deductions: Deduction[],
  periodId: string,
  periodStart: Date,
  periodEnd: Date,
  totalHoursAllEmployees: number,
  employeeCount: number
): PayrollRecord;
/**
 * Calculate payroll for all employees in a period
 */
export declare function calculatePayroll(input: PayrollCalculationInput): {
  records: PayrollRecord[];
  summary: {
    totalEmployees: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalTaxes: number;
    totalDeductions: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalTips: number;
  };
  warnings: string[];
};
/**
 * Verify payroll balances
 * Ensures gross - taxes - deductions = net for all records
 */
export declare function verifyPayrollBalances(records: PayrollRecord[]): {
  isValid: boolean;
  discrepancies: Array<{
    employeeId: string;
    expected: number;
    actual: number;
    diff: number;
  }>;
};
//# sourceMappingURL=calculator.d.ts.map
