// Prisma Payroll Data Source
// Implements PayrollDataSource interface using Prisma database client

import type { PrismaClient } from "@repo/database";
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
export class PrismaPayrollDataSource implements PayrollDataSource {
  #prisma: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >;

  constructor(
    prisma: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >
  ) {
    this.#prisma = prisma;
  }

  async getEmployees(tenantId: string): Promise<Employee[]> {
    const users = await this.#prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        payrollRole: true,
      },
    });

    return users
      .filter((user) => user.roleId !== null)
      .map((user) => ({
        id: user.id,
        tenantId: user.tenantId,
        name: `${user.firstName} ${user.lastName}`,
        department: undefined,
        roleId: user.roleId!,
        currency: "USD",
        hourlyRate: user.hourlyRate ? Number(user.hourlyRate) : 0,
        taxInfo: undefined, // TODO: Add tax info when model exists
        payrollPrefs: undefined, // TODO: Add payroll prefs when model exists
      }));
  }

  async getRoles(tenantId: string): Promise<Role[]> {
    const roles = await this.#prisma.role.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        is_active: true,
      },
    });

    return roles.map((role) => ({
      id: role.id,
      tenantId: role.tenant_id,
      name: role.name,
      baseRate: Number(role.base_rate),
      overtimeMultiplier: Number(role.overtime_multiplier),
      overtimeThresholdHours: role.overtime_threshold_hours,
    }));
  }

  async getTimeEntries(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<TimeEntryInput[]> {
    const timeEntries = await this.#prisma.timeEntry.findMany({
      where: {
        tenantId,
        deleted_at: null,
        approved_at: { not: null }, // Only use approved time entries for payroll
      },
    });

    // Filter by date range since we need to check shift dates
    // and calculate hours from clockIn/clockOut
    return timeEntries
      .filter((entry) => {
        const entryDate = entry.clockIn;
        return entryDate >= periodStart && entryDate <= periodEnd;
      })
      .map((entry) => {
        // Calculate hours worked from clockIn/clockOut
        let hoursWorked = 0;
        if (entry.clockOut) {
          const diffMs = entry.clockOut.getTime() - entry.clockIn.getTime();
          const breakMs = (entry.breakMinutes || 0) * 60 * 1000;
          hoursWorked = Math.max(0, (diffMs - breakMs) / (1000 * 60 * 60));
        }

        return {
          id: entry.id,
          tenantId: entry.tenantId,
          employeeId: entry.employeeId,
          date: entry.clockIn,
          hoursWorked,
          hoursRegular: Math.min(hoursWorked, 40), // Assume 40h threshold
          hoursOvertime: Math.max(0, hoursWorked - 40),
          approved: entry.approved_at !== null,
        };
      });
  }

  async getTipPools(_tenantId: string, _periodId: string): Promise<TipPool[]> {
    // TODO: Implement tip pools when model exists
    return [];
  }

  async getDeductions(tenantId: string): Promise<Deduction[]> {
    const deductions = await this.#prisma.employeeDeduction.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        // Only active deductions (effective date passed, not expired)
        effective_date: {
          lte: new Date(),
        },
        OR: [{ end_date: null }, { end_date: { gte: new Date() } }],
      },
    });

    return deductions.map((deduction) => ({
      id: deduction.id,
      tenantId: deduction.tenant_id,
      employeeId: deduction.employee_id,
      type: deduction.type as
        | "benefits"
        | "health_insurance"
        | "dental_insurance"
        | "vision_insurance"
        | "retirement_401k"
        | "retirement_ira"
        | "garnishment"
        | "child_support"
        | "union_dues"
        | "loan_repayment"
        | "other",
      name: deduction.name,
      amount: deduction.amount ? Number(deduction.amount) : undefined,
      percentage: deduction.percentage
        ? Number(deduction.percentage)
        : undefined,
      isPreTax: deduction.is_pre_tax,
      effectiveDate: deduction.effective_date,
      endDate: deduction.end_date || undefined,
      maxAnnualAmount: deduction.max_annual_amount
        ? Number(deduction.max_annual_amount)
        : undefined,
    }));
  }

  async savePayrollPeriod(period: PayrollPeriod): Promise<void> {
    await this.#prisma.payroll_periods.upsert({
      where: {
        tenant_id_id: {
          tenant_id: period.tenantId,
          id: period.id,
        },
      },
      create: {
        tenant_id: period.tenantId,
        id: period.id,
        period_start: period.startDate,
        period_end: period.endDate,
        status: period.status,
        created_at: period.createdAt || new Date(),
        updated_at: period.updatedAt || new Date(),
      },
      update: {
        status: period.status,
        updated_at: period.updatedAt || new Date(),
      },
    });
  }

  async savePayrollRecords(records: PayrollRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const tenantId = records[0].tenantId;
    const periodId = records[0].periodId;

    // First, get or create the payroll run
    const summary = records.reduce(
      (acc, record) => ({
        totalGross: acc.totalGross + record.grossPay,
        totalDeductions: acc.totalDeductions + record.totalDeductions,
        totalNet: acc.totalNet + record.netPay,
      }),
      { totalGross: 0, totalDeductions: 0, totalNet: 0 }
    );

    const payrollRun = await this.#prisma.payroll_runs.upsert({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: periodId,
        },
      },
      create: {
        tenant_id: tenantId,
        id: periodId,
        payroll_period_id: periodId,
        run_date: new Date(),
        status: "completed",
        total_gross: summary.totalGross,
        total_deductions: summary.totalDeductions,
        total_net: summary.totalNet,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        total_gross: summary.totalGross,
        total_deductions: summary.totalDeductions,
        total_net: summary.totalNet,
        status: "completed",
        updated_at: new Date(),
      },
    });

    // Save payroll line items
    for (const record of records) {
      await this.#prisma.payroll_line_items.upsert({
        where: {
          tenant_id_id: {
            tenant_id: record.tenantId,
            id: `${payrollRun.id}_${record.employeeId}`,
          },
        },
        create: {
          tenant_id: record.tenantId,
          id: `${payrollRun.id}_${record.employeeId}`,
          payroll_run_id: payrollRun.id,
          employee_id: record.employeeId,
          hours_regular: record.hoursRegular,
          hours_overtime: record.hoursOvertime,
          rate_regular: record.regularPay / record.hoursRegular || 0,
          rate_overtime: record.overtimePay / record.hoursOvertime || 0,
          gross_pay: record.grossPay,
          deductions: JSON.stringify({
            preTax: record.preTaxDeductions,
            postTax: record.postTaxDeductions,
          }),
          net_pay: record.netPay,
          created_at: record.createdAt || new Date(),
          updated_at: new Date(),
        },
        update: {
          hours_regular: record.hoursRegular,
          hours_overtime: record.hoursOvertime,
          rate_regular: record.regularPay / record.hoursRegular || 0,
          rate_overtime: record.overtimePay / record.hoursOvertime || 0,
          gross_pay: record.grossPay,
          deductions: JSON.stringify({
            preTax: record.preTaxDeductions,
            postTax: record.postTaxDeductions,
          }),
          net_pay: record.netPay,
          updated_at: new Date(),
        },
      });
    }
  }

  async savePayrollAudit(audit: PayrollAudit): Promise<void> {
    // TODO: Implement audit logging when PayrollAudit model exists
    // For now, log to console
    console.log("[PayrollAudit]", {
      id: audit.id,
      tenantId: audit.tenantId,
      periodId: audit.periodId,
      action: audit.action,
      userId: audit.userId,
      timestamp: audit.timestamp,
    });
  }

  async getPayrollPeriod(
    tenantId: string,
    periodId: string
  ): Promise<PayrollPeriod | null> {
    const period = await this.#prisma.payroll_periods.findUnique({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: periodId,
        },
      },
    });

    if (!period) {
      return null;
    }

    return {
      id: period.id,
      tenantId: period.tenant_id,
      startDate: period.period_start,
      endDate: period.period_end,
      status: period.status,
      currency: "USD",
      createdAt: period.created_at,
      updatedAt: period.updated_at,
    };
  }

  async getPayrollRecords(
    tenantId: string,
    periodId: string
  ): Promise<PayrollRecord[]> {
    const payrollRun = await this.#prisma.payroll_runs.findFirst({
      where: {
        tenant_id: tenantId,
        payroll_period_id: periodId,
      },
    });

    if (!payrollRun) {
      return [];
    }

    const lineItems = await this.#prisma.payroll_line_items.findMany({
      where: {
        tenant_id: tenantId,
        payroll_run_id: payrollRun.id,
      },
    });

    // Get employee names
    const employeeIds = lineItems.map(
      (item: { employee_id: string }) => item.employee_id
    );
    const employees = await this.#prisma.user.findMany({
      where: {
        id: { in: employeeIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const employeeMap = new Map(
      employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`])
    );

    return lineItems.map(
      (item: {
        id: string;
        tenant_id: string;
        employee_id: string;
        deductions: string | null;
        hours_regular: bigint | number;
        hours_overtime: bigint | number;
        rate_regular: bigint | number;
        rate_overtime: bigint | number;
        gross_pay: bigint | number;
        net_pay: bigint | number;
        created_at: Date;
      }) => {
        const deductions = JSON.parse(item.deductions || "{}");
        return {
          id: item.id,
          tenantId: item.tenant_id,
          periodId,
          employeeId: item.employee_id,
          employeeName: employeeMap.get(item.employee_id) || "Unknown",
          department: undefined, // TODO: Add department when available
          roleName: "Default", // TODO: Get from role
          hoursRegular: Number(item.hours_regular),
          hoursOvertime: Number(item.hours_overtime),
          regularPay: Number(item.rate_regular) * Number(item.hours_regular),
          overtimePay: Number(item.rate_overtime) * Number(item.hours_overtime),
          tips: 0, // TODO: Add tips when available
          grossPay: Number(item.gross_pay),
          preTaxDeductions: deductions.preTax || [],
          taxableIncome: Number(item.gross_pay),
          taxesWithheld: [], // TODO: Add taxes when available
          totalTaxes: 0, // TODO: Calculate from taxes
          postTaxDeductions: deductions.postTax || [],
          totalDeductions: Number(item.gross_pay) - Number(item.net_pay),
          netPay: Number(item.net_pay),
          currency: "USD",
          createdAt: item.created_at,
        };
      }
    );
  }
}
