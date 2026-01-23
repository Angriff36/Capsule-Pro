// Payroll Engine Models
// These types define the data structures for payroll calculations

import { z } from "zod";

// ============================================
// Employee Types
// ============================================

export const TaxInfoSchema = z.object({
  jurisdiction: z.string(),
  status: z.enum(["single", "married", "head_of_household"]),
  federalWithholdingAllowances: z.number().int().min(0).default(0),
  stateWithholdingAllowances: z.number().int().min(0).default(0),
  additionalWithholding: z.number().min(0).default(0),
});

export type TaxInfo = z.infer<typeof TaxInfoSchema>;

export const PayrollPrefsSchema = z.object({
  payPeriodFrequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly"]),
  roundingRule: z
    .enum(["nearest_quarter", "nearest_tenth", "none"])
    .default("none"),
});

export type PayrollPrefs = z.infer<typeof PayrollPrefsSchema>;

export const EmployeeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  department: z.string().optional(),
  roleId: z.string().uuid(),
  currency: z.string().default("USD"),
  hourlyRate: z.number().min(0),
  taxInfo: TaxInfoSchema.optional(),
  payrollPrefs: PayrollPrefsSchema.optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;

// ============================================
// Role Types
// ============================================

export const RoleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  baseRate: z.number().min(0), // per hour
  overtimeMultiplier: z.number().min(1).default(1.5),
  overtimeThresholdHours: z.number().min(0).default(40), // per period
});

export type Role = z.infer<typeof RoleSchema>;

// ============================================
// Time Entry Types
// ============================================

export const TimeEntrySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  employeeId: z.string().uuid(),
  date: z.coerce.date(),
  hoursWorked: z.number().min(0),
  hoursRegular: z.number().min(0),
  hoursOvertime: z.number().min(0).default(0),
  approved: z.boolean().default(false),
});

export type TimeEntryInput = z.infer<typeof TimeEntrySchema>;

// ============================================
// Tip Pool Types
// ============================================

export const TipAllocationRule = z.enum([
  "by_hours",
  "by_headcount",
  "fixed_shares",
]);

export const TipPoolSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  periodId: z.string().uuid(),
  totalTips: z.number().min(0),
  allocationRule: TipAllocationRule,
  fixedShares: z.record(z.string().uuid(), z.number()).optional(), // employeeId -> share percentage
});

export type TipPool = z.infer<typeof TipPoolSchema>;

// ============================================
// Deduction Types
// ============================================

export const DeductionTypeEnum = z.enum([
  "benefits",
  "health_insurance",
  "dental_insurance",
  "vision_insurance",
  "retirement_401k",
  "retirement_ira",
  "garnishment",
  "child_support",
  "union_dues",
  "loan_repayment",
  "other",
]);

export const DeductionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: DeductionTypeEnum,
  name: z.string(),
  amount: z.number().min(0).optional(), // fixed amount
  percentage: z.number().min(0).max(100).optional(), // percentage of gross
  isPreTax: z.boolean().default(false),
  effectiveDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  maxAnnualAmount: z.number().min(0).optional(), // cap
});

export type Deduction = z.infer<typeof DeductionSchema>;

// ============================================
// Payroll Period Types
// ============================================

export const PayrollPeriodStatusEnum = z.enum([
  "draft",
  "processing",
  "pending_approval",
  "approved",
  "finalized",
  "failed",
]);

export const PayrollPeriodSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: PayrollPeriodStatusEnum.default("draft"),
  currency: z.string().default("USD"),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type PayrollPeriod = z.infer<typeof PayrollPeriodSchema>;

// ============================================
// Payroll Record Types (Output)
// ============================================

export const DeductionLineSchema = z.object({
  deductionId: z.string().uuid(),
  type: DeductionTypeEnum,
  name: z.string(),
  amount: z.number(),
  isPreTax: z.boolean(),
});

export type DeductionLine = z.infer<typeof DeductionLineSchema>;

export const TaxWithholdingSchema = z.object({
  type: z.enum([
    "federal",
    "state",
    "local",
    "social_security",
    "medicare",
    "other",
  ]),
  jurisdiction: z.string().optional(),
  amount: z.number().min(0),
});

export type TaxWithholding = z.infer<typeof TaxWithholdingSchema>;

export const PayrollRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  periodId: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeName: z.string(),
  department: z.string().optional(),
  roleName: z.string(),
  hoursRegular: z.number().min(0),
  hoursOvertime: z.number().min(0),
  regularPay: z.number().min(0),
  overtimePay: z.number().min(0),
  tips: z.number().min(0).default(0),
  grossPay: z.number().min(0),
  preTaxDeductions: z.array(DeductionLineSchema),
  taxableIncome: z.number().min(0),
  taxesWithheld: z.array(TaxWithholdingSchema),
  totalTaxes: z.number().min(0),
  postTaxDeductions: z.array(DeductionLineSchema),
  totalDeductions: z.number().min(0),
  netPay: z.number(),
  currency: z.string().default("USD"),
  auditId: z.string().uuid().optional(),
  createdAt: z.coerce.date().optional(),
});

export type PayrollRecord = z.infer<typeof PayrollRecordSchema>;

// ============================================
// Audit Types
// ============================================

export const PayrollAuditSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  periodId: z.string().uuid(),
  action: z.enum([
    "generated",
    "recalculated",
    "approved",
    "exported",
    "voided",
  ]),
  userId: z.string().uuid().optional(),
  timestamp: z.coerce.date(),
  inputSnapshot: z.any().optional(),
  rulesVersion: z.string().optional(),
  resultSummary: z
    .object({
      totalEmployees: z.number(),
      totalGrossPay: z.number(),
      totalNetPay: z.number(),
      totalTaxes: z.number(),
      totalDeductions: z.number(),
    })
    .optional(),
});

export type PayrollAudit = z.infer<typeof PayrollAuditSchema>;

// ============================================
// Calculation Input Types
// ============================================

export const PayrollCalculationInputSchema = z.object({
  tenantId: z.string().uuid(),
  periodId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  employees: z.array(EmployeeSchema),
  roles: z.array(RoleSchema),
  timeEntries: z.array(TimeEntrySchema),
  tipPools: z.array(TipPoolSchema).optional(),
  deductions: z.array(DeductionSchema).optional(),
  jurisdiction: z.string().optional(),
});

export type PayrollCalculationInput = z.infer<
  typeof PayrollCalculationInputSchema
>;

// ============================================
// API Types
// ============================================

export const GeneratePayrollRequestSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  jurisdiction: z.string().optional(),
  regenerateOnDataChange: z.boolean().default(false),
});

export type GeneratePayrollRequest = z.infer<
  typeof GeneratePayrollRequestSchema
>;

export const GeneratePayrollResponseSchema = z.object({
  batchId: z.string().uuid(),
  status: z.enum(["processing", "completed", "failed"]),
  periodId: z.string().uuid(),
  estimatedTotals: z.object({
    totalGross: z.number(),
    totalNet: z.number(),
    totalTaxes: z.number(),
    totalDeductions: z.number(),
    employeeCount: z.number(),
  }),
});

export type GeneratePayrollResponse = z.infer<
  typeof GeneratePayrollResponseSchema
>;

export const ExportFormat = z.enum(["csv", "qbxml", "qbOnlineCsv", "json"]);
export type ExportFormatType = z.infer<typeof ExportFormat>;
