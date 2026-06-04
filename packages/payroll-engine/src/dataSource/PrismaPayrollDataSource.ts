// Prisma Payroll Data Source
// Implements PayrollDataSource interface using Prisma database client

import type { PrismaClient } from "@repo/database/generated/client";
import { money } from "../core/currency";
import { calculateTaxes } from "../core/taxEngine";
import type {
  Deduction,
  Employee,
  PayrollAudit,
  PayrollPeriod,
  PayrollPrefs,
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
  readonly #prisma: Omit<
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
    // User (IR-generated model) has no Prisma relations — fetch related data separately
    const users = await this.#prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
    });

    const activeUsers = users.filter(
      (user) => user.roleId !== null && user.roleId !== ""
    );
    if (activeUsers.length === 0) return [];

    const employeeIds = activeUsers.map((u) => u.id);

    // Fetch related records in parallel
    const [taxInfoRows, payrollPrefsRows] = await Promise.all([
      this.#prisma.employeeTaxInfo.findMany({
        where: { tenantId, employeeId: { in: employeeIds }, deletedAt: null },
      }),
      this.#prisma.employeePayrollPrefs.findMany({
        where: { tenantId, employeeId: { in: employeeIds }, deletedAt: null },
      }),
    ]);

    const taxInfoByEmployee = new Map(
      taxInfoRows.map((r) => [r.employeeId, r])
    );
    const payrollPrefsByEmployee = new Map(
      payrollPrefsRows.map((r) => [r.employeeId, r])
    );

    return activeUsers.map((user) => {
      const taxInfo = taxInfoByEmployee.get(user.id);
      const payrollPrefs = payrollPrefsByEmployee.get(user.id);
      return {
        id: user.id,
        tenantId: user.tenantId,
        name: `${user.firstName} ${user.lastName}`,
        department: undefined, // no relation available on IR User model
        roleId: user.roleId!,
        currency: "USD",
        hourlyRate: user.hourlyRate ? Number(user.hourlyRate) : 0,
        taxInfo: taxInfo
          ? {
              jurisdiction: taxInfo.jurisdiction,
              status: taxInfo.filingStatus as
                | "single"
                | "married"
                | "head_of_household",
              federalWithholdingAllowances:
                taxInfo.federalWithholdingAllowances,
              stateWithholdingAllowances: taxInfo.stateWithholdingAllowances,
              additionalWithholding: Number(taxInfo.additionalWithholding),
            }
          : undefined,
        payrollPrefs: payrollPrefs
          ? {
              payPeriodFrequency:
                payrollPrefs.payPeriodFrequency as PayrollPrefs["payPeriodFrequency"],
              roundingRule: payrollPrefs.roundingRule as
                | "nearest_quarter"
                | "nearest_tenth"
                | "none",
            }
          : undefined,
      };
    });
  }

  async getRoles(tenantId: string): Promise<Role[]> {
    const roles = await this.#prisma.role.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
    });

    return roles.map((role) => ({
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      baseRate: Number(role.baseRate),
      overtimeMultiplier: Number(role.overtimeMultiplier),
      overtimeThresholdHours: role.overtimeThresholdHours,
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
        deletedAt: null,
        approvedAt: { not: null }, // Only use approved time entries for payroll
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
          approved: entry.approvedAt !== null,
        };
      });
  }

  async getTipPools(tenantId: string, periodId: string): Promise<TipPool[]> {
    const pools = await this.#prisma.tipPool.findMany({
      where: {
        tenantId,
        periodId,
        deletedAt: null,
      },
    });

    return pools.map((pool) => ({
      id: pool.id,
      tenantId: pool.tenantId,
      periodId: pool.periodId ?? "",
      totalTips: Number(pool.totalTips),
      allocationRule: (pool.allocationRule ?? "by_hours") as
        | "by_hours"
        | "by_headcount"
        | "fixed_shares",
      fixedShares: pool.fixedShares
        ? ((typeof pool.fixedShares === "string"
            ? JSON.parse(pool.fixedShares)
            : pool.fixedShares) as Record<string, number>)
        : undefined,
    }));
  }

  async getDeductions(tenantId: string): Promise<Deduction[]> {
    const deductions = await this.#prisma.employeeDeduction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        // Only active deductions (effective date passed, not expired)
        effectiveDate: {
          lte: new Date(),
        },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
    });

    return deductions.map((deduction) => ({
      id: deduction.id,
      tenantId: deduction.tenantId,
      employeeId: deduction.employeeId,
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
      isPreTax: deduction.isPreTax,
      effectiveDate: deduction.effectiveDate,
      endDate: deduction.endDate || undefined,
      maxAnnualAmount: deduction.maxAnnualAmount
        ? Number(deduction.maxAnnualAmount)
        : undefined,
    }));
  }

  async savePayrollPeriod(period: PayrollPeriod): Promise<void> {
    await this.#prisma.payrollPeriod.upsert({
      where: {
        tenantId_id: {
          tenantId: period.tenantId,
          id: period.id,
        },
      },
      create: {
        tenantId: period.tenantId,
        id: period.id,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        status: period.status,
        createdAt: period.createdAt || new Date(),
        updatedAt: period.updatedAt || new Date(),
      },
      update: {
        status: period.status,
        updatedAt: period.updatedAt || new Date(),
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

    const payrollRun = await this.#prisma.payrollRun.upsert({
      where: {
        tenantId_id: {
          tenantId,
          id: periodId,
        },
      },
      create: {
        tenantId,
        id: periodId,
        payrollPeriodId: periodId,
        runDate: new Date(),
        status: "completed",
        totalGross: summary.totalGross,
        totalDeductions: summary.totalDeductions,
        totalNet: summary.totalNet,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        totalGross: summary.totalGross,
        totalDeductions: summary.totalDeductions,
        totalNet: summary.totalNet,
        status: "completed",
        updatedAt: new Date(),
      },
    });

    // Save payroll line items
    for (const record of records) {
      await this.#prisma.payrollLineItem.upsert({
        where: {
          tenantId_id: {
            tenantId: record.tenantId,
            id: `${payrollRun.id}_${record.employeeId}`,
          },
        },
        create: {
          tenantId: record.tenantId,
          id: `${payrollRun.id}_${record.employeeId}`,
          payrollRunId: payrollRun.id,
          employeeId: record.employeeId,
          hoursRegular: record.hoursRegular,
          hoursOvertime: record.hoursOvertime,
          rateRegular: record.regularPay / record.hoursRegular || 0,
          rateOvertime: record.overtimePay / record.hoursOvertime || 0,
          grossPay: record.grossPay,
          deductions: JSON.stringify({
            preTax: record.preTaxDeductions,
            postTax: record.postTaxDeductions,
          }),
          netPay: record.netPay,
          createdAt: record.createdAt || new Date(),
          updatedAt: new Date(),
        },
        update: {
          hoursRegular: record.hoursRegular,
          hoursOvertime: record.hoursOvertime,
          rateRegular: record.regularPay / record.hoursRegular || 0,
          rateOvertime: record.overtimePay / record.hoursOvertime || 0,
          grossPay: record.grossPay,
          deductions: JSON.stringify({
            preTax: record.preTaxDeductions,
            postTax: record.postTaxDeductions,
          }),
          netPay: record.netPay,
          updatedAt: new Date(),
        },
      });
    }
  }

  async savePayrollAudit(audit: PayrollAudit): Promise<void> {
    try {
      await this.#prisma.payrollAuditLog.create({
        data: {
          tenantId: audit.tenantId,
          id: audit.id,
          periodId: audit.periodId,
          action: audit.action,
          userId: audit.userId ?? null,
          inputSnapshot: audit.inputSnapshot ?? undefined,
          rulesVersion: audit.rulesVersion ?? null,
          resultSummary: audit.resultSummary ?? undefined,
        },
      });
    } catch (error) {
      // Audit failures must not crash payroll processing
      console.error("[PayrollAudit] Failed to persist audit log", error);
    }
  }

  async getPayrollPeriod(
    tenantId: string,
    periodId: string
  ): Promise<PayrollPeriod | null> {
    const period = await this.#prisma.payrollPeriod.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: periodId,
        },
      },
    });

    if (!period) {
      return null;
    }

    return {
      id: period.id,
      tenantId: period.tenantId,
      startDate: period.periodStart,
      endDate: period.periodEnd,
      status: period.status as
        | "draft"
        | "processing"
        | "pending_approval"
        | "approved"
        | "finalized"
        | "failed",
      currency: "USD",
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }

  async getPayrollRecords(
    tenantId: string,
    periodId: string
  ): Promise<PayrollRecord[]> {
    const payrollRun = await this.#prisma.payrollRun.findFirst({
      where: {
        tenantId,
        payrollPeriodId: periodId,
      },
    });

    if (!payrollRun) {
      return [];
    }

    const lineItems = await this.#prisma.payrollLineItem.findMany({
      where: {
        tenantId,
        payrollRunId: payrollRun.id,
      },
    });

    // Get employee names and departments
    const employeeIds = lineItems.map(
      (item: { employeeId: string }) => item.employeeId
    );
    const employees = await this.#prisma.user.findMany({
      where: {
        id: { in: employeeIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: {
          select: { name: true },
        },
        payrollRole: {
          select: { name: true },
        },
      },
    });

    const employeeMap = new Map(
      employees.map((e) => [
        e.id,
        {
          name: `${e.firstName} ${e.lastName}`,
          department: e.department?.name ?? undefined,
          roleName: e.payrollRole?.name ?? "Default",
        },
      ])
    );

    // Fetch tip pools for this period
    const tipPoolEntries = await this.getTipPools(tenantId, periodId);
    const tipsByEmployee = new Map<string, number>();
    for (const pool of tipPoolEntries) {
      if (pool.allocationRule === "fixed_shares" && pool.fixedShares) {
        for (const [empId, share] of Object.entries(pool.fixedShares)) {
          const current = tipsByEmployee.get(empId) ?? 0;
          tipsByEmployee.set(empId, current + share);
        }
      }
    }

    return lineItems.map((item) => {
      const deductions = JSON.parse((item.deductions as string) || "{}");
      const grossPay = Number(item.grossPay);
      const netPay = Number(item.netPay);

      const empData = employeeMap.get(item.employeeId);
      const preTaxTotal =
        (deductions.preTax as Array<{ amount: number }>)?.reduce(
          (sum: number, d: { amount: number }) => sum + d.amount,
          0
        ) ?? 0;

      const employee: Employee = {
        id: item.employeeId,
        tenantId: item.tenantId,
        name: empData?.name ?? "Unknown",
        roleId: "",
        currency: "USD",
        hourlyRate: Number(item.rateRegular),
        taxInfo: undefined,
        payrollPrefs: undefined,
      };

      const taxResult = calculateTaxes({
        grossPay: money(grossPay),
        preTaxDeductions: money(preTaxTotal),
        employee,
      });

      return {
        id: item.id,
        tenantId: item.tenantId,
        periodId,
        employeeId: item.employeeId,
        employeeName: empData?.name ?? "Unknown",
        department: empData?.department,
        roleName: empData?.roleName ?? "Default",
        hoursRegular: Number(item.hoursRegular),
        hoursOvertime: Number(item.hoursOvertime),
        regularPay: Number(item.rateRegular) * Number(item.hoursRegular),
        overtimePay: Number(item.rateOvertime) * Number(item.hoursOvertime),
        tips: tipsByEmployee.get(item.employeeId) ?? 0,
        grossPay,
        preTaxDeductions: deductions.preTax || [],
        taxableIncome: taxResult.taxableIncome.toNumber(),
        taxesWithheld: taxResult.withholdings,
        totalTaxes: taxResult.totalTax.toNumber(),
        postTaxDeductions: deductions.postTax || [],
        totalDeductions: grossPay - netPay,
        netPay,
        currency: "USD",
        createdAt: item.createdAt,
      };
    });
  }
}
