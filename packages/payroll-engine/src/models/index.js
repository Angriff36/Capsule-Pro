// Payroll Engine Models
// These types define the data structures for payroll calculations
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportFormat =
  exports.GeneratePayrollResponseSchema =
  exports.GeneratePayrollRequestSchema =
  exports.PayrollCalculationInputSchema =
  exports.PayrollAuditSchema =
  exports.PayrollRecordSchema =
  exports.TaxWithholdingSchema =
  exports.DeductionLineSchema =
  exports.PayrollPeriodSchema =
  exports.PayrollPeriodStatusEnum =
  exports.DeductionSchema =
  exports.DeductionTypeEnum =
  exports.TipPoolSchema =
  exports.TipAllocationRule =
  exports.TimeEntrySchema =
  exports.RoleSchema =
  exports.EmployeeSchema =
  exports.PayrollPrefsSchema =
  exports.TaxInfoSchema =
    void 0;
const zod_1 = require("zod");
// ============================================
// Employee Types
// ============================================
exports.TaxInfoSchema = zod_1.z.object({
  jurisdiction: zod_1.z.string(),
  status: zod_1.z.enum(["single", "married", "head_of_household"]),
  federalWithholdingAllowances: zod_1.z.number().int().min(0).default(0),
  stateWithholdingAllowances: zod_1.z.number().int().min(0).default(0),
  additionalWithholding: zod_1.z.number().min(0).default(0),
});
exports.PayrollPrefsSchema = zod_1.z.object({
  payPeriodFrequency: zod_1.z.enum([
    "weekly",
    "biweekly",
    "semimonthly",
    "monthly",
  ]),
  roundingRule: zod_1.z
    .enum(["nearest_quarter", "nearest_tenth", "none"])
    .default("none"),
});
exports.EmployeeSchema = zod_1.z.object({
  id: zod_1.z.string().uuid(),
  tenantId: zod_1.z.string().uuid(),
  name: zod_1.z.string(),
  department: zod_1.z.string().optional(),
  roleId: zod_1.z.string().uuid(),
  currency: zod_1.z.string().default("USD"),
  hourlyRate: zod_1.z.number().min(0),
  taxInfo: exports.TaxInfoSchema.optional(),
  payrollPrefs: exports.PayrollPrefsSchema.optional(),
});
// ============================================
// Role Types
// ============================================
exports.RoleSchema = zod_1.z.object({
  id: zod_1.z.string().uuid(),
  tenantId: zod_1.z.string().uuid(),
  name: zod_1.z.string(),
  baseRate: zod_1.z.number().min(0), // per hour
  overtimeMultiplier: zod_1.z.number().min(1).default(1.5),
  overtimeThresholdHours: zod_1.z.number().min(0).default(40), // per period
});
// ============================================
// Time Entry Types
// ============================================
exports.TimeEntrySchema = zod_1.z.object({
  id: zod_1.z.string().uuid(),
  tenantId: zod_1.z.string().uuid(),
  employeeId: zod_1.z.string().uuid(),
  date: zod_1.z.coerce.date(),
  hoursWorked: zod_1.z.number().min(0),
  hoursRegular: zod_1.z.number().min(0),
  hoursOvertime: zod_1.z.number().min(0).default(0),
  approved: zod_1.z.boolean().default(false),
});
// ============================================
// Tip Pool Types
// ============================================
exports.TipAllocationRule = zod_1.z.enum([
  "by_hours",
  "by_headcount",
  "fixed_shares",
]);
exports.TipPoolSchema = zod_1.z.object({
  id: zod_1.z.string().uuid(),
  tenantId: zod_1.z.string().uuid(),
  periodId: zod_1.z.string().uuid(),
  totalTips: zod_1.z.number().min(0),
  allocationRule: exports.TipAllocationRule,
  fixedShares: zod_1.z
    .record(zod_1.z.string().uuid(), zod_1.z.number())
    .optional(), // employeeId -> share percentage
});
// ============================================
// Deduction Types
// ============================================
exports.DeductionTypeEnum = zod_1.z.enum([
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
exports.DeductionSchema = zod_1.z.object({
  id: zod_1.z.string().uuid(),
  tenantId: zod_1.z.string().uuid(),
  employeeId: zod_1.z.string().uuid(),
  type: exports.DeductionTypeEnum,
  name: zod_1.z.string(),
  amount: zod_1.z.number().min(0).optional(), // fixed amount
  percentage: zod_1.z.number().min(0).max(100).optional(), // percentage of gross
  isPreTax: zod_1.z.boolean().default(false),
  effectiveDate: zod_1.z.coerce.date(),
  endDate: zod_1.z.coerce.date().optional(),
  maxAnnualAmount: zod_1.z.number().min(0).optional(), // cap
});
// ============================================
// Payroll Period Types
// ============================================
exports.PayrollPeriodStatusEnum = zod_1.z.enum([
  "draft",
  "processing",
  "pending_approval",
  "approved",
  "finalized",
  "failed",
]);
exports.PayrollPeriodSchema = zod_1.z.object({
  id: zod_1.z.string().uuid(),
  tenantId: zod_1.z.string().uuid(),
  startDate: zod_1.z.coerce.date(),
  endDate: zod_1.z.coerce.date(),
  status: exports.PayrollPeriodStatusEnum.default("draft"),
  currency: zod_1.z.string().default("USD"),
  createdAt: zod_1.z.coerce.date().optional(),
  updatedAt: zod_1.z.coerce.date().optional(),
});
// ============================================
// Payroll Record Types (Output)
// ============================================
exports.DeductionLineSchema = zod_1.z.object({
  deductionId: zod_1.z.string().uuid(),
  type: exports.DeductionTypeEnum,
  name: zod_1.z.string(),
  amount: zod_1.z.number(),
  isPreTax: zod_1.z.boolean(),
});
exports.TaxWithholdingSchema = zod_1.z.object({
  type: zod_1.z.enum([
    "federal",
    "state",
    "local",
    "social_security",
    "medicare",
    "other",
  ]),
  jurisdiction: zod_1.z.string().optional(),
  amount: zod_1.z.number().min(0),
});
exports.PayrollRecordSchema = zod_1.z.object({
  id: zod_1.z.string().uuid(),
  tenantId: zod_1.z.string().uuid(),
  periodId: zod_1.z.string().uuid(),
  employeeId: zod_1.z.string().uuid(),
  employeeName: zod_1.z.string(),
  department: zod_1.z.string().optional(),
  roleName: zod_1.z.string(),
  hoursRegular: zod_1.z.number().min(0),
  hoursOvertime: zod_1.z.number().min(0),
  regularPay: zod_1.z.number().min(0),
  overtimePay: zod_1.z.number().min(0),
  tips: zod_1.z.number().min(0).default(0),
  grossPay: zod_1.z.number().min(0),
  preTaxDeductions: zod_1.z.array(exports.DeductionLineSchema),
  taxableIncome: zod_1.z.number().min(0),
  taxesWithheld: zod_1.z.array(exports.TaxWithholdingSchema),
  totalTaxes: zod_1.z.number().min(0),
  postTaxDeductions: zod_1.z.array(exports.DeductionLineSchema),
  totalDeductions: zod_1.z.number().min(0),
  netPay: zod_1.z.number(),
  currency: zod_1.z.string().default("USD"),
  auditId: zod_1.z.string().uuid().optional(),
  createdAt: zod_1.z.coerce.date().optional(),
});
// ============================================
// Audit Types
// ============================================
exports.PayrollAuditSchema = zod_1.z.object({
  id: zod_1.z.string().uuid(),
  tenantId: zod_1.z.string().uuid(),
  periodId: zod_1.z.string().uuid(),
  action: zod_1.z.enum([
    "generated",
    "recalculated",
    "approved",
    "exported",
    "voided",
  ]),
  userId: zod_1.z.string().uuid().optional(),
  timestamp: zod_1.z.coerce.date(),
  inputSnapshot: zod_1.z.any().optional(),
  rulesVersion: zod_1.z.string().optional(),
  resultSummary: zod_1.z
    .object({
      totalEmployees: zod_1.z.number(),
      totalGrossPay: zod_1.z.number(),
      totalNetPay: zod_1.z.number(),
      totalTaxes: zod_1.z.number(),
      totalDeductions: zod_1.z.number(),
    })
    .optional(),
});
// ============================================
// Calculation Input Types
// ============================================
exports.PayrollCalculationInputSchema = zod_1.z.object({
  tenantId: zod_1.z.string().uuid(),
  periodId: zod_1.z.string().uuid(),
  periodStart: zod_1.z.coerce.date(),
  periodEnd: zod_1.z.coerce.date(),
  employees: zod_1.z.array(exports.EmployeeSchema),
  roles: zod_1.z.array(exports.RoleSchema),
  timeEntries: zod_1.z.array(exports.TimeEntrySchema),
  tipPools: zod_1.z.array(exports.TipPoolSchema).optional(),
  deductions: zod_1.z.array(exports.DeductionSchema).optional(),
  jurisdiction: zod_1.z.string().optional(),
});
// ============================================
// API Types
// ============================================
exports.GeneratePayrollRequestSchema = zod_1.z.object({
  periodStart: zod_1.z.string(),
  periodEnd: zod_1.z.string(),
  jurisdiction: zod_1.z.string().optional(),
  regenerateOnDataChange: zod_1.z.boolean().default(false),
});
exports.GeneratePayrollResponseSchema = zod_1.z.object({
  batchId: zod_1.z.string().uuid(),
  status: zod_1.z.enum(["processing", "completed", "failed"]),
  periodId: zod_1.z.string().uuid(),
  estimatedTotals: zod_1.z.object({
    totalGross: zod_1.z.number(),
    totalNet: zod_1.z.number(),
    totalTaxes: zod_1.z.number(),
    totalDeductions: zod_1.z.number(),
    employeeCount: zod_1.z.number(),
  }),
});
exports.ExportFormat = zod_1.z.enum(["csv", "qbxml", "qbOnlineCsv", "json"]);
