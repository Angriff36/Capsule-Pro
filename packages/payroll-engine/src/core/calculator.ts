import type {
  Deduction,
  DeductionLine,
  Employee,
  PayrollCalculationInput,
  PayrollRecord,
  Role,
  TimeEntryInput,
  TipPool,
} from "../models";
import { Currency, money } from "./currency";
import { calculateTaxes } from "./taxEngine";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

type RoundingRule = "nearest_quarter" | "nearest_tenth" | "none";

const roundingStrategies: Record<RoundingRule, (hours: number) => number> = {
  nearest_quarter: (hours) => Math.round(hours * 4) / 4,
  nearest_tenth: (hours) => Math.round(hours * 10) / 10,
  none: (hours) => hours,
};

/**
 * Generate a deterministic UUID based on periodId and employeeId
 * This ensures idempotent payroll record generation
 */
function generatePayrollRecordId(periodId: string, employeeId: string): string {
  // Create a deterministic ID from period + employee
  const combined = `${periodId}:${employeeId}`;
  // Use a simple hash to create a UUID-like string
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }
  // Format as UUID-like string
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${periodId.slice(0, 8)}-${employeeId.slice(0, 4)}-4${hex.slice(0, 3)}-${hex.slice(3, 7)}-${hex.slice(0, 12).padEnd(12, "0")}`;
}

/**
 * Round hours according to rounding rule
 */
function roundHours(hours: number, rule: RoundingRule): number {
  const strategy = roundingStrategies[rule] ?? roundingStrategies.none;
  return strategy(hours);
}

type TipAllocationContext = {
  pool: TipPool;
  employeeId: string;
  employeeHours: number;
  totalHoursAllEmployees: number;
  employeeCount: number;
};

type TipAllocationStrategy = (context: TipAllocationContext) => Currency;

const tipAllocationStrategies: Record<
  TipPool["allocationRule"],
  TipAllocationStrategy
> = {
  by_hours: ({
    pool,
    employeeHours,
    totalHoursAllEmployees,
  }: TipAllocationContext) => {
    if (totalHoursAllEmployees <= 0) {
      return Currency.zero();
    }
    const share = employeeHours / totalHoursAllEmployees;
    return money(pool.totalTips).multiply(share);
  },
  by_headcount: ({ pool, employeeCount }: TipAllocationContext) => {
    if (employeeCount <= 0) {
      return Currency.zero();
    }
    return money(pool.totalTips).divide(employeeCount);
  },
  fixed_shares: ({ pool, employeeId }: TipAllocationContext) => {
    const sharePercentage = pool.fixedShares?.[employeeId];
    if (!sharePercentage) {
      return Currency.zero();
    }
    return money(pool.totalTips).percentage(sharePercentage);
  },
};

/**
 * Aggregate time entries for an employee in a period
 */
function aggregateTimeEntries(
  entries: TimeEntryInput[],
  overtimeThreshold: number,
  roundingRule: "nearest_quarter" | "nearest_tenth" | "none" = "none"
): { hoursRegular: number; hoursOvertime: number } {
  let totalHours = 0;

  for (const entry of entries) {
    if (!entry.approved) {
      continue; // Skip unapproved entries
    }
    totalHours += entry.hoursWorked;
  }

  // Apply rounding
  totalHours = roundHours(totalHours, roundingRule);

  // Split into regular and overtime
  const hoursRegular = Math.min(totalHours, overtimeThreshold);
  const hoursOvertime = Math.max(0, totalHours - overtimeThreshold);

  return { hoursRegular, hoursOvertime };
}

/**
 * Calculate tip allocation for an employee
 */
function calculateTipAllocation(
  employeeId: string,
  tipPools: TipPool[],
  employeeHours: number,
  totalHoursAllEmployees: number,
  employeeCount: number
): Currency {
  let totalTips = Currency.zero();

  for (const pool of tipPools) {
    if (pool.totalTips <= 0) {
      continue;
    }

    const strategy = tipAllocationStrategies[pool.allocationRule];
    invariant(
      strategy,
      `Unsupported tip allocation rule: ${pool.allocationRule}`
    );
    totalTips = totalTips.add(
      strategy({
        pool,
        employeeId,
        employeeHours,
        totalHoursAllEmployees,
        employeeCount,
      })
    );
  }

  return totalTips;
}

/**
 * Apply deductions for an employee
 */
function applyDeductions(
  deductions: Deduction[],
  employeeId: string,
  grossPay: Currency,
  periodStart: Date,
  periodEnd: Date
): {
  preTax: DeductionLine[];
  postTax: DeductionLine[];
  preTaxTotal: Currency;
  postTaxTotal: Currency;
} {
  const preTax: DeductionLine[] = [];
  const postTax: DeductionLine[] = [];
  let preTaxTotal = Currency.zero();
  let postTaxTotal = Currency.zero();

  // Filter deductions for this employee and period
  const applicableDeductions = deductions.filter((d) => {
    if (d.employeeId !== employeeId) {
      return false;
    }
    if (d.effectiveDate > periodEnd) {
      return false;
    }
    if (d.endDate && d.endDate < periodStart) {
      return false;
    }
    return true;
  });

  for (const deduction of applicableDeductions) {
    let amount: Currency;

    if (deduction.percentage !== undefined && deduction.percentage > 0) {
      amount = grossPay.percentage(deduction.percentage);
    } else if (deduction.amount !== undefined) {
      amount = money(deduction.amount);
    } else {
      continue; // Skip if no amount or percentage
    }

    // Cap deduction if needed
    if (deduction.maxAnnualAmount !== undefined) {
      // In a real implementation, we'd track YTD deductions
      // For now, we'll just apply the per-period amount
    }

    const line: DeductionLine = {
      deductionId: deduction.id,
      type: deduction.type,
      name: deduction.name,
      amount: amount.toNumber(),
      isPreTax: deduction.isPreTax,
    };

    if (deduction.isPreTax) {
      preTax.push(line);
      preTaxTotal = preTaxTotal.add(amount);
    } else {
      postTax.push(line);
      postTaxTotal = postTaxTotal.add(amount);
    }
  }

  return { preTax, postTax, preTaxTotal, postTaxTotal };
}

type PayrollRecordBuildInput = {
  employee: Employee;
  role: Role;
  timeEntries: TimeEntryInput[];
  tipPools: TipPool[];
  deductions: Deduction[];
  periodId: string;
  periodStart: Date;
  periodEnd: Date;
  totalHoursAllEmployees: number;
  employeeCount: number;
};

function buildPayrollRecord(input: PayrollRecordBuildInput): PayrollRecord {
  const {
    employee,
    role,
    timeEntries,
    tipPools,
    deductions,
    periodId,
    periodStart,
    periodEnd,
    totalHoursAllEmployees,
    employeeCount,
  } = input;

  const roundingRule = employee.payrollPrefs?.roundingRule || "none";
  const payPeriodFrequency =
    employee.payrollPrefs?.payPeriodFrequency || "biweekly";

  // 1. Aggregate time entries
  const employeeEntries = timeEntries.filter(
    (e) => e.employeeId === employee.id
  );
  const { hoursRegular, hoursOvertime } = aggregateTimeEntries(
    employeeEntries,
    role.overtimeThresholdHours,
    roundingRule
  );

  // 2. Calculate base pay
  const regularRate = money(role.baseRate);
  const overtimeRate = regularRate.multiply(role.overtimeMultiplier);

  const regularPay = regularRate.multiply(hoursRegular);
  const overtimePay = overtimeRate.multiply(hoursOvertime);

  // 3. Calculate tips
  const employeeHours = hoursRegular + hoursOvertime;
  const tips = calculateTipAllocation(
    employee.id,
    tipPools,
    employeeHours,
    totalHoursAllEmployees,
    employeeCount
  );

  // 4. Calculate gross pay
  const grossPay = regularPay.add(overtimePay).add(tips);

  // 5. Apply deductions
  const { preTax, postTax, preTaxTotal, postTaxTotal } = applyDeductions(
    deductions,
    employee.id,
    grossPay,
    periodStart,
    periodEnd
  );

  // 6. Calculate taxes
  const taxResult = calculateTaxes({
    grossPay,
    preTaxDeductions: preTaxTotal,
    employee,
    payPeriodFrequency,
  });

  // 7. Calculate net pay
  const netPay = grossPay
    .subtract(preTaxTotal)
    .subtract(taxResult.totalTax)
    .subtract(postTaxTotal);

  // Validate: net pay should not be negative (cap deductions if needed)
  let finalNetPay = netPay;
  let adjustedPostTaxTotal = postTaxTotal;
  let adjustedPostTax = postTax;

  if (netPay.isNegative()) {
    // Calculate maximum available for post-tax deductions
    const availableForPostTax = grossPay
      .subtract(preTaxTotal)
      .subtract(taxResult.totalTax);

    if (availableForPostTax.isPositive()) {
      // Reduce post-tax deductions proportionally
      const reductionRatio =
        availableForPostTax.toNumber() / postTaxTotal.toNumber();
      adjustedPostTax = postTax.map((d) => ({
        ...d,
        amount: money(d.amount).multiply(reductionRatio).toNumber(),
      }));
      adjustedPostTaxTotal = availableForPostTax;
      finalNetPay = Currency.zero();
    } else {
      // Can't cover all obligations - flag for review
      adjustedPostTax = [];
      adjustedPostTaxTotal = Currency.zero();
      finalNetPay = availableForPostTax.nonNegative();
    }
  }

  return {
    id: generatePayrollRecordId(periodId, employee.id),
    tenantId: employee.tenantId,
    periodId,
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    roleName: role.name,
    hoursRegular,
    hoursOvertime,
    regularPay: regularPay.toNumber(),
    overtimePay: overtimePay.toNumber(),
    tips: tips.toNumber(),
    grossPay: grossPay.toNumber(),
    preTaxDeductions: preTax,
    taxableIncome: taxResult.taxableIncome.toNumber(),
    taxesWithheld: taxResult.withholdings,
    totalTaxes: taxResult.totalTax.toNumber(),
    postTaxDeductions: adjustedPostTax,
    totalDeductions: preTaxTotal.add(adjustedPostTaxTotal).toNumber(),
    netPay: finalNetPay.toNumber(),
    currency: employee.currency,
    createdAt: new Date(),
  };
}

export class PayrollRecordBuilder {
  private employee?: Employee;
  private role?: Role;
  private timeEntries?: TimeEntryInput[];
  private tipPools: TipPool[] = [];
  private deductions: Deduction[] = [];
  private periodId?: string;
  private periodStart?: Date;
  private periodEnd?: Date;
  private totalHoursAllEmployees?: number;
  private employeeCount?: number;

  setEmployee(employee: Employee): this {
    this.employee = employee;
    return this;
  }

  setRole(role: Role): this {
    this.role = role;
    return this;
  }

  setTimeEntries(timeEntries: TimeEntryInput[]): this {
    this.timeEntries = timeEntries;
    return this;
  }

  setTipPools(tipPools: TipPool[]): this {
    this.tipPools = tipPools;
    return this;
  }

  setDeductions(deductions: Deduction[]): this {
    this.deductions = deductions;
    return this;
  }

  setPeriod(periodId: string, periodStart: Date, periodEnd: Date): this {
    this.periodId = periodId;
    this.periodStart = periodStart;
    this.periodEnd = periodEnd;
    return this;
  }

  setTotals(totalHoursAllEmployees: number, employeeCount: number): this {
    this.totalHoursAllEmployees = totalHoursAllEmployees;
    this.employeeCount = employeeCount;
    return this;
  }

  build(): PayrollRecord {
    invariant(this.employee, "PayrollRecordBuilder.employee must be set");
    invariant(this.role, "PayrollRecordBuilder.role must be set");
    invariant(this.timeEntries, "PayrollRecordBuilder.timeEntries must be set");
    invariant(this.periodId, "PayrollRecordBuilder.periodId must be set");
    invariant(this.periodStart, "PayrollRecordBuilder.periodStart must be set");
    invariant(this.periodEnd, "PayrollRecordBuilder.periodEnd must be set");
    invariant(
      this.totalHoursAllEmployees !== undefined,
      "PayrollRecordBuilder.totalHoursAllEmployees must be set"
    );
    invariant(
      this.employeeCount !== undefined,
      "PayrollRecordBuilder.employeeCount must be set"
    );

    return buildPayrollRecord({
      employee: this.employee,
      role: this.role,
      timeEntries: this.timeEntries,
      tipPools: this.tipPools,
      deductions: this.deductions,
      periodId: this.periodId,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      totalHoursAllEmployees: this.totalHoursAllEmployees,
      employeeCount: this.employeeCount,
    });
  }
}

/**
 * Calculate payroll for all employees in a period
 */
export function calculatePayroll(input: PayrollCalculationInput): {
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
} {
  const {
    tenantId,
    periodId,
    periodStart,
    periodEnd,
    employees,
    roles,
    timeEntries,
    tipPools = [],
    deductions = [],
  } = input;

  const records: PayrollRecord[] = [];
  const warnings: string[] = [];

  // Create role lookup map
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  // Filter approved time entries
  const approvedEntries = timeEntries.filter((e) => e.approved);

  // Calculate total hours for tip allocation
  let totalHoursAllEmployees = 0;
  for (const entry of approvedEntries) {
    totalHoursAllEmployees += entry.hoursWorked;
  }

  const employeeCount = employees.length;

  // Calculate payroll for each employee
  for (const employee of employees) {
    const role = roleMap.get(employee.roleId);

    if (!role) {
      warnings.push(
        `Employee ${employee.id} has no valid role assignment (roleId: ${employee.roleId})`
      );
      continue;
    }

    // Check for missing time entries
    const employeeEntries = approvedEntries.filter(
      (e) => e.employeeId === employee.id
    );
    if (employeeEntries.length === 0) {
      warnings.push(
        `Employee ${employee.name} (${employee.id}) has no approved time entries for this period`
      );
      // Continue with zero hours - they may still get tips
    }

    try {
      const record = new PayrollRecordBuilder()
        .setEmployee(employee)
        .setRole(role)
        .setTimeEntries(approvedEntries)
        .setTipPools(tipPools)
        .setDeductions(deductions)
        .setPeriod(periodId, periodStart, periodEnd)
        .setTotals(totalHoursAllEmployees, employeeCount)
        .build();

      records.push(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(
        `Failed to calculate payroll for employee ${employee.name}: ${message}`
      );
    }
  }

  // Calculate summary totals
  const summary = records.reduce(
    (acc, record) => ({
      totalEmployees: acc.totalEmployees + 1,
      totalGrossPay: acc.totalGrossPay + record.grossPay,
      totalNetPay: acc.totalNetPay + record.netPay,
      totalTaxes: acc.totalTaxes + record.totalTaxes,
      totalDeductions: acc.totalDeductions + record.totalDeductions,
      totalRegularHours: acc.totalRegularHours + record.hoursRegular,
      totalOvertimeHours: acc.totalOvertimeHours + record.hoursOvertime,
      totalTips: acc.totalTips + record.tips,
    }),
    {
      totalEmployees: 0,
      totalGrossPay: 0,
      totalNetPay: 0,
      totalTaxes: 0,
      totalDeductions: 0,
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalTips: 0,
    }
  );

  // Validate tip allocation sums
  const totalAllocatedTips = records.reduce((sum, r) => sum + r.tips, 0);
  const totalPoolTips = tipPools.reduce((sum, p) => sum + p.totalTips, 0);

  if (Math.abs(totalAllocatedTips - totalPoolTips) > 0.01) {
    warnings.push(
      `Tip allocation mismatch: Pool total ${totalPoolTips.toFixed(2)}, Allocated ${totalAllocatedTips.toFixed(2)}`
    );
  }

  // Round summary values
  summary.totalGrossPay = money(summary.totalGrossPay).toNumber();
  summary.totalNetPay = money(summary.totalNetPay).toNumber();
  summary.totalTaxes = money(summary.totalTaxes).toNumber();
  summary.totalDeductions = money(summary.totalDeductions).toNumber();
  summary.totalTips = money(summary.totalTips).toNumber();

  return { records, summary, warnings };
}

/**
 * Verify payroll balances
 * Ensures gross - taxes - deductions = net for all records
 */
export function verifyPayrollBalances(records: PayrollRecord[]): {
  isValid: boolean;
  discrepancies: Array<{
    employeeId: string;
    expected: number;
    actual: number;
    diff: number;
  }>;
} {
  const discrepancies: Array<{
    employeeId: string;
    expected: number;
    actual: number;
    diff: number;
  }> = [];

  for (const record of records) {
    const expectedNet = money(record.grossPay)
      .subtract(record.totalTaxes)
      .subtract(record.totalDeductions)
      .toNumber();

    const diff = Math.abs(expectedNet - record.netPay);

    // Allow for rounding differences up to 1 cent
    if (diff > 0.01) {
      discrepancies.push({
        employeeId: record.employeeId,
        expected: expectedNet,
        actual: record.netPay,
        diff,
      });
    }
  }

  return {
    isValid: discrepancies.length === 0,
    discrepancies,
  };
}
