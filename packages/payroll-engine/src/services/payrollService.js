Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPayrollDataSource = exports.PayrollService = void 0;
const crypto_1 = require("crypto");
const calculator_1 = require("../core/calculator");
const exporters_1 = require("../exporters");
/**
 * Payroll Service
 * Orchestrates payroll generation, validation, and export
 */
class PayrollService {
  dataSource;
  defaultJurisdiction;
  enableAuditLog;
  constructor(config) {
    this.dataSource = config.dataSource;
    this.defaultJurisdiction = config.defaultJurisdiction || "US";
    this.enableAuditLog = config.enableAuditLog ?? true;
  }
  /**
   * Generate payroll for a period
   */
  async generatePayroll(tenantId, request, userId) {
    const periodStart = new Date(request.periodStart);
    const periodEnd = new Date(request.periodEnd);
    const periodId = this.generatePeriodId(tenantId, periodStart, periodEnd);
    const batchId = (0, crypto_1.randomUUID)();
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
      const input = {
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
      const { records, summary, warnings } = (0, calculator_1.calculatePayroll)(
        input
      );
      // Verify balances
      const validation = (0, calculator_1.verifyPayrollBalances)(records);
      if (!validation.isValid) {
        console.warn(
          "Payroll balance discrepancies detected:",
          validation.discrepancies
        );
      }
      // Create period record
      const period = {
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
        const audit = {
          id: (0, crypto_1.randomUUID)(),
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
  async getReport(tenantId, periodId, options) {
    const period = await this.dataSource.getPayrollPeriod(tenantId, periodId);
    if (!period) {
      throw new Error(`Payroll period not found: ${periodId}`);
    }
    const records = await this.dataSource.getPayrollRecords(tenantId, periodId);
    if (records.length === 0) {
      throw new Error(`No payroll records found for period: ${periodId}`);
    }
    return (0, exporters_1.exportPayroll)(records, period, options);
  }
  /**
   * Export to QuickBooks
   */
  async exportToQuickBooks(tenantId, periodId, target, userId) {
    const exportResult = await this.getReport(tenantId, periodId, {
      format: target,
      aggregate: true, // Use aggregate entry for QB
    });
    const exportId = (0, crypto_1.randomUUID)();
    // Log export audit
    if (this.enableAuditLog) {
      const audit = {
        id: (0, crypto_1.randomUUID)(),
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
  generatePeriodId(tenantId, startDate, endDate) {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const combined = `${tenantId}:${startStr}:${endStr}`;
    // Simple hash for deterministic ID
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    return `${hex}-${startStr.replace(/-/g, "")}-${endStr.replace(/-/g, "")}`;
  }
}
exports.PayrollService = PayrollService;
/**
 * In-memory data source for testing
 */
class InMemoryPayrollDataSource {
  employees = [];
  roles = [];
  timeEntries = [];
  tipPools = [];
  deductions = [];
  periods = new Map();
  records = new Map();
  audits = [];
  setEmployees(employees) {
    this.employees = employees;
  }
  setRoles(roles) {
    this.roles = roles;
  }
  setTimeEntries(entries) {
    this.timeEntries = entries;
  }
  setTipPools(pools) {
    this.tipPools = pools;
  }
  setDeductions(deductions) {
    this.deductions = deductions;
  }
  async getEmployees(_tenantId) {
    return this.employees;
  }
  async getRoles(_tenantId) {
    return this.roles;
  }
  async getTimeEntries(_tenantId, _periodStart, _periodEnd) {
    return this.timeEntries;
  }
  async getTipPools(_tenantId, _periodId) {
    return this.tipPools;
  }
  async getDeductions(_tenantId) {
    return this.deductions;
  }
  async savePayrollPeriod(period) {
    this.periods.set(period.id, period);
  }
  async savePayrollRecords(records) {
    if (records.length > 0) {
      this.records.set(records[0].periodId, records);
    }
  }
  async savePayrollAudit(audit) {
    this.audits.push(audit);
  }
  async getPayrollPeriod(_tenantId, periodId) {
    return this.periods.get(periodId) || null;
  }
  async getPayrollRecords(_tenantId, periodId) {
    return this.records.get(periodId) || [];
  }
  getAudits() {
    return this.audits;
  }
}
exports.InMemoryPayrollDataSource = InMemoryPayrollDataSource;
