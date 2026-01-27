import { randomUUID } from "node:crypto";
import { calculatePayroll, verifyPayrollBalances } from "../core/calculator";
import {
  type ExportOptions,
  type ExportResult,
  exportPayroll,
} from "../exporters";
import type {
  Deduction,
  Employee,
  GeneratePayrollRequest,
  GeneratePayrollResponse,
  PayrollAudit,
  PayrollCalculationInput,
  PayrollPeriod,
  PayrollRecord,
  Role,
  TimeEntryInput,
  TipPool,
} from "../models";

/**
 * Data source interface for fetching payroll inputs
 * Implement this interface to connect to your database
 */
export type PayrollDataSource = {
  getEmployees(tenantId: string): Promise<Employee[]>;
  getRoles(tenantId: string): Promise<Role[]>;
  getTimeEntries(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<TimeEntryInput[]>;
  getTipPools(tenantId: string, periodId: string): Promise<TipPool[]>;
  getDeductions(tenantId: string): Promise<Deduction[]>;

  // Save operations
  savePayrollPeriod(period: PayrollPeriod): Promise<void>;
  savePayrollRecords(records: PayrollRecord[]): Promise<void>;
  savePayrollAudit(audit: PayrollAudit): Promise<void>;

  // Lookup operations
  getPayrollPeriod(
    tenantId: string,
    periodId: string
  ): Promise<PayrollPeriod | null>;
  getPayrollRecords(
    tenantId: string,
    periodId: string
  ): Promise<PayrollRecord[]>;
};

/**
 * Payroll Service Configuration
 */
export type PayrollServiceConfig = {
  dataSource: PayrollDataSource;
  defaultJurisdiction?: string;
  enableAuditLog?: boolean;
};

/**
 * Payroll Service
 * Orchestrates payroll generation, validation, and export
 */
export class PayrollService {
  private readonly dataSource: PayrollDataSource;
  private readonly defaultJurisdiction: string;
  private readonly enableAuditLog: boolean;

  constructor(config: PayrollServiceConfig) {
    this.dataSource = config.dataSource;
    this.defaultJurisdiction = config.defaultJurisdiction || "US";
    this.enableAuditLog = config.enableAuditLog ?? true;
  }

  /**
   * Generate payroll for a period
   */
  async generatePayroll(
    tenantId: string,
    request: GeneratePayrollRequest,
    userId?: string
  ): Promise<GeneratePayrollResponse> {
    const periodStart = new Date(request.periodStart);
    const periodEnd = new Date(request.periodEnd);
    const periodId = this.generatePeriodId(tenantId, periodStart, periodEnd);
    const batchId = randomUUID();

    try {
      // Fetch all required data
      const [employees, roles, timeEntries, tipPools, deductions] =
        await Promise.all([
          this.dataSource.getEmployees(tenantId),
          this.dataSource.getRoles(tenantId),
          this.dataSource.getTimeEntries(tenantId, periodStart, periodEnd),
          this.dataSource.getTipPools(tenantId, periodId),
          this.dataSource.getDeductions(tenantId),
        ]);

      // Prepare calculation input
      const input: PayrollCalculationInput = {
        tenantId,
        periodId,
        periodStart,
        periodEnd,
        employees,
        roles,
        timeEntries,
        tipPools,
        deductions,
        jurisdiction: request.jurisdiction || this.defaultJurisdiction,
      };

      // Calculate payroll
      const { records, summary, warnings } = calculatePayroll(input);

      // Verify balances
      const validation = verifyPayrollBalances(records);

      if (!validation.isValid) {
        console.warn(
          "Payroll balance discrepancies detected:",
          validation.discrepancies
        );
      }

      // Create period record
      const period: PayrollPeriod = {
        id: periodId,
        tenantId,
        startDate: periodStart,
        endDate: periodEnd,
        status: "finalized",
        currency: "USD",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save results
      await this.dataSource.savePayrollPeriod(period);
      await this.dataSource.savePayrollRecords(records);

      // Create audit record
      if (this.enableAuditLog) {
        const audit: PayrollAudit = {
          id: randomUUID(),
          tenantId,
          periodId,
          action: "generated",
          userId,
          timestamp: new Date(),
          inputSnapshot: {
            employeeCount: employees.length,
            timeEntryCount: timeEntries.length,
            tipPoolCount: tipPools.length,
            deductionCount: deductions.length,
          },
          rulesVersion: "1.0.0",
          resultSummary: {
            totalEmployees: summary.totalEmployees,
            totalGrossPay: summary.totalGrossPay,
            totalNetPay: summary.totalNetPay,
            totalTaxes: summary.totalTaxes,
            totalDeductions: summary.totalDeductions,
          },
        };

        await this.dataSource.savePayrollAudit(audit);
      }

      return {
        batchId,
        status: "completed",
        periodId,
        estimatedTotals: {
          totalGross: summary.totalGrossPay,
          totalNet: summary.totalNetPay,
          totalTaxes: summary.totalTaxes,
          totalDeductions: summary.totalDeductions,
          employeeCount: summary.totalEmployees,
        },
      };
    } catch (error) {
      console.error("Payroll generation failed:", error);

      return {
        batchId,
        status: "failed",
        periodId,
        estimatedTotals: {
          totalGross: 0,
          totalNet: 0,
          totalTaxes: 0,
          totalDeductions: 0,
          employeeCount: 0,
        },
      };
    }
  }

  /**
   * Get payroll report in specified format
   */
  async getReport(
    tenantId: string,
    periodId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const period = await this.dataSource.getPayrollPeriod(tenantId, periodId);
    if (!period) {
      throw new Error(`Payroll period not found: ${periodId}`);
    }

    const records = await this.dataSource.getPayrollRecords(tenantId, periodId);
    if (records.length === 0) {
      throw new Error(`No payroll records found for period: ${periodId}`);
    }

    return exportPayroll(records, period, options);
  }

  /**
   * Export to QuickBooks
   */
  async exportToQuickBooks(
    tenantId: string,
    periodId: string,
    target: "qbxml" | "qbOnlineCsv",
    userId?: string
  ): Promise<{ exportId: string; content: string; format: string }> {
    const exportResult = await this.getReport(tenantId, periodId, {
      format: target,
      aggregate: true, // Use aggregate entry for QB
    });

    const exportId = randomUUID();

    // Log export audit
    if (this.enableAuditLog) {
      const audit: PayrollAudit = {
        id: randomUUID(),
        tenantId,
        periodId,
        action: "exported",
        userId,
        timestamp: new Date(),
        inputSnapshot: {
          format: target,
          exportId,
        },
      };

      await this.dataSource.savePayrollAudit(audit);
    }

    return {
      exportId,
      content: exportResult.content,
      format: target,
    };
  }

  /**
   * Generate deterministic period ID
   */
  private generatePeriodId(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): string {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const combined = `${tenantId}:${startStr}:${endStr}`;

    // Simple hash for deterministic ID
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash;
    }

    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    return `${hex}-${startStr.replace(/-/g, "")}-${endStr.replace(/-/g, "")}`;
  }
}

/**
 * In-memory data source for testing
 */
export class InMemoryPayrollDataSource implements PayrollDataSource {
  private employees: Employee[] = [];
  private roles: Role[] = [];
  private timeEntries: TimeEntryInput[] = [];
  private tipPools: TipPool[] = [];
  private deductions: Deduction[] = [];
  private readonly periods: Map<string, PayrollPeriod> = new Map();
  private readonly records: Map<string, PayrollRecord[]> = new Map();
  private readonly audits: PayrollAudit[] = [];

  setEmployees(employees: Employee[]): void {
    this.employees = employees;
  }

  setRoles(roles: Role[]): void {
    this.roles = roles;
  }

  setTimeEntries(entries: TimeEntryInput[]): void {
    this.timeEntries = entries;
  }

  setTipPools(pools: TipPool[]): void {
    this.tipPools = pools;
  }

  setDeductions(deductions: Deduction[]): void {
    this.deductions = deductions;
  }

  async getEmployees(_tenantId: string): Promise<Employee[]> {
    return this.employees;
  }

  async getRoles(_tenantId: string): Promise<Role[]> {
    return this.roles;
  }

  async getTimeEntries(
    _tenantId: string,
    _periodStart: Date,
    _periodEnd: Date
  ): Promise<TimeEntryInput[]> {
    return this.timeEntries;
  }

  async getTipPools(_tenantId: string, _periodId: string): Promise<TipPool[]> {
    return this.tipPools;
  }

  async getDeductions(_tenantId: string): Promise<Deduction[]> {
    return this.deductions;
  }

  async savePayrollPeriod(period: PayrollPeriod): Promise<void> {
    this.periods.set(period.id, period);
  }

  async savePayrollRecords(records: PayrollRecord[]): Promise<void> {
    if (records.length > 0) {
      this.records.set(records[0].periodId, records);
    }
  }

  async savePayrollAudit(audit: PayrollAudit): Promise<void> {
    this.audits.push(audit);
  }

  async getPayrollPeriod(
    _tenantId: string,
    periodId: string
  ): Promise<PayrollPeriod | null> {
    return this.periods.get(periodId) || null;
  }

  async getPayrollRecords(
    _tenantId: string,
    periodId: string
  ): Promise<PayrollRecord[]> {
    return this.records.get(periodId) || [];
  }

  getAudits(): PayrollAudit[] {
    return this.audits;
  }
}
