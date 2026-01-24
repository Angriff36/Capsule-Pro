import { type ExportOptions, type ExportResult } from "../exporters";
import type {
  Deduction,
  Employee,
  GeneratePayrollRequest,
  GeneratePayrollResponse,
  PayrollAudit,
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
export interface PayrollDataSource {
  getEmployees(tenantId: string): Promise<Employee[]>;
  getRoles(tenantId: string): Promise<Role[]>;
  getTimeEntries(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<TimeEntryInput[]>;
  getTipPools(tenantId: string, periodId: string): Promise<TipPool[]>;
  getDeductions(tenantId: string): Promise<Deduction[]>;
  savePayrollPeriod(period: PayrollPeriod): Promise<void>;
  savePayrollRecords(records: PayrollRecord[]): Promise<void>;
  savePayrollAudit(audit: PayrollAudit): Promise<void>;
  getPayrollPeriod(
    tenantId: string,
    periodId: string
  ): Promise<PayrollPeriod | null>;
  getPayrollRecords(
    tenantId: string,
    periodId: string
  ): Promise<PayrollRecord[]>;
}
/**
 * Payroll Service Configuration
 */
export interface PayrollServiceConfig {
  dataSource: PayrollDataSource;
  defaultJurisdiction?: string;
  enableAuditLog?: boolean;
}
/**
 * Payroll Service
 * Orchestrates payroll generation, validation, and export
 */
export declare class PayrollService {
  private dataSource;
  private defaultJurisdiction;
  private enableAuditLog;
  constructor(config: PayrollServiceConfig);
  /**
   * Generate payroll for a period
   */
  generatePayroll(
    tenantId: string,
    request: GeneratePayrollRequest,
    userId?: string
  ): Promise<GeneratePayrollResponse>;
  /**
   * Get payroll report in specified format
   */
  getReport(
    tenantId: string,
    periodId: string,
    options: ExportOptions
  ): Promise<ExportResult>;
  /**
   * Export to QuickBooks
   */
  exportToQuickBooks(
    tenantId: string,
    periodId: string,
    target: "qbxml" | "qbOnlineCsv",
    userId?: string
  ): Promise<{
    exportId: string;
    content: string;
    format: string;
  }>;
  /**
   * Generate deterministic period ID
   */
  private generatePeriodId;
}
/**
 * In-memory data source for testing
 */
export declare class InMemoryPayrollDataSource implements PayrollDataSource {
  private employees;
  private roles;
  private timeEntries;
  private tipPools;
  private deductions;
  private periods;
  private records;
  private audits;
  setEmployees(employees: Employee[]): void;
  setRoles(roles: Role[]): void;
  setTimeEntries(entries: TimeEntryInput[]): void;
  setTipPools(pools: TipPool[]): void;
  setDeductions(deductions: Deduction[]): void;
  getEmployees(_tenantId: string): Promise<Employee[]>;
  getRoles(_tenantId: string): Promise<Role[]>;
  getTimeEntries(
    _tenantId: string,
    _periodStart: Date,
    _periodEnd: Date
  ): Promise<TimeEntryInput[]>;
  getTipPools(_tenantId: string, _periodId: string): Promise<TipPool[]>;
  getDeductions(_tenantId: string): Promise<Deduction[]>;
  savePayrollPeriod(period: PayrollPeriod): Promise<void>;
  savePayrollRecords(records: PayrollRecord[]): Promise<void>;
  savePayrollAudit(audit: PayrollAudit): Promise<void>;
  getPayrollPeriod(
    _tenantId: string,
    periodId: string
  ): Promise<PayrollPeriod | null>;
  getPayrollRecords(
    _tenantId: string,
    periodId: string
  ): Promise<PayrollRecord[]>;
  getAudits(): PayrollAudit[];
}
//# sourceMappingURL=payrollService.d.ts.map
