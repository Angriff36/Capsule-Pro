import type {
  Deduction,
  Employee,
  PayrollAudit,
  PayrollPeriod,
  PayrollRecord,
  Role,
  TimeEntryInput,
  TipPool,
} from "../models";
import type { PayrollDataSource } from "../services";
/**
 * Prisma-based implementation of PayrollDataSource
 * Connects the payroll engine to the actual database
 */
export declare class PrismaPayrollDataSource implements PayrollDataSource {
  private prisma;
  private getTenantId;
  constructor(
    prisma: any, // PrismaClient type
    getTenantId: () => string
  );
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
//# sourceMappingURL=PrismaPayrollDataSource.d.ts.map
