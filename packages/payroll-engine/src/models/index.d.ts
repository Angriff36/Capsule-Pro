import { z } from "zod";
export declare const TaxInfoSchema: z.ZodObject<
  {
    jurisdiction: z.ZodString;
    status: z.ZodEnum<{
      single: "single";
      married: "married";
      head_of_household: "head_of_household";
    }>;
    federalWithholdingAllowances: z.ZodDefault<z.ZodNumber>;
    stateWithholdingAllowances: z.ZodDefault<z.ZodNumber>;
    additionalWithholding: z.ZodDefault<z.ZodNumber>;
  },
  z.core.$strip
>;
export type TaxInfo = z.infer<typeof TaxInfoSchema>;
export declare const PayrollPrefsSchema: z.ZodObject<
  {
    payPeriodFrequency: z.ZodEnum<{
      weekly: "weekly";
      biweekly: "biweekly";
      semimonthly: "semimonthly";
      monthly: "monthly";
    }>;
    roundingRule: z.ZodDefault<
      z.ZodEnum<{
        none: "none";
        nearest_quarter: "nearest_quarter";
        nearest_tenth: "nearest_tenth";
      }>
    >;
  },
  z.core.$strip
>;
export type PayrollPrefs = z.infer<typeof PayrollPrefsSchema>;
export declare const EmployeeSchema: z.ZodObject<
  {
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    department: z.ZodOptional<z.ZodString>;
    roleId: z.ZodString;
    currency: z.ZodDefault<z.ZodString>;
    hourlyRate: z.ZodNumber;
    taxInfo: z.ZodOptional<
      z.ZodObject<
        {
          jurisdiction: z.ZodString;
          status: z.ZodEnum<{
            single: "single";
            married: "married";
            head_of_household: "head_of_household";
          }>;
          federalWithholdingAllowances: z.ZodDefault<z.ZodNumber>;
          stateWithholdingAllowances: z.ZodDefault<z.ZodNumber>;
          additionalWithholding: z.ZodDefault<z.ZodNumber>;
        },
        z.core.$strip
      >
    >;
    payrollPrefs: z.ZodOptional<
      z.ZodObject<
        {
          payPeriodFrequency: z.ZodEnum<{
            weekly: "weekly";
            biweekly: "biweekly";
            semimonthly: "semimonthly";
            monthly: "monthly";
          }>;
          roundingRule: z.ZodDefault<
            z.ZodEnum<{
              none: "none";
              nearest_quarter: "nearest_quarter";
              nearest_tenth: "nearest_tenth";
            }>
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type Employee = z.infer<typeof EmployeeSchema>;
export declare const RoleSchema: z.ZodObject<
  {
    id: z.ZodString;
    tenantId: z.ZodString;
    name: z.ZodString;
    baseRate: z.ZodNumber;
    overtimeMultiplier: z.ZodDefault<z.ZodNumber>;
    overtimeThresholdHours: z.ZodDefault<z.ZodNumber>;
  },
  z.core.$strip
>;
export type Role = z.infer<typeof RoleSchema>;
export declare const TimeEntrySchema: z.ZodObject<
  {
    id: z.ZodString;
    tenantId: z.ZodString;
    employeeId: z.ZodString;
    date: z.ZodCoercedDate<unknown>;
    hoursWorked: z.ZodNumber;
    hoursRegular: z.ZodNumber;
    hoursOvertime: z.ZodDefault<z.ZodNumber>;
    approved: z.ZodDefault<z.ZodBoolean>;
  },
  z.core.$strip
>;
export type TimeEntryInput = z.infer<typeof TimeEntrySchema>;
export declare const TipAllocationRule: z.ZodEnum<{
  by_hours: "by_hours";
  by_headcount: "by_headcount";
  fixed_shares: "fixed_shares";
}>;
export declare const TipPoolSchema: z.ZodObject<
  {
    id: z.ZodString;
    tenantId: z.ZodString;
    periodId: z.ZodString;
    totalTips: z.ZodNumber;
    allocationRule: z.ZodEnum<{
      by_hours: "by_hours";
      by_headcount: "by_headcount";
      fixed_shares: "fixed_shares";
    }>;
    fixedShares: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
  },
  z.core.$strip
>;
export type TipPool = z.infer<typeof TipPoolSchema>;
export declare const DeductionTypeEnum: z.ZodEnum<{
  other: "other";
  benefits: "benefits";
  health_insurance: "health_insurance";
  dental_insurance: "dental_insurance";
  vision_insurance: "vision_insurance";
  retirement_401k: "retirement_401k";
  retirement_ira: "retirement_ira";
  garnishment: "garnishment";
  child_support: "child_support";
  union_dues: "union_dues";
  loan_repayment: "loan_repayment";
}>;
export declare const DeductionSchema: z.ZodObject<
  {
    id: z.ZodString;
    tenantId: z.ZodString;
    employeeId: z.ZodString;
    type: z.ZodEnum<{
      other: "other";
      benefits: "benefits";
      health_insurance: "health_insurance";
      dental_insurance: "dental_insurance";
      vision_insurance: "vision_insurance";
      retirement_401k: "retirement_401k";
      retirement_ira: "retirement_ira";
      garnishment: "garnishment";
      child_support: "child_support";
      union_dues: "union_dues";
      loan_repayment: "loan_repayment";
    }>;
    name: z.ZodString;
    amount: z.ZodOptional<z.ZodNumber>;
    percentage: z.ZodOptional<z.ZodNumber>;
    isPreTax: z.ZodDefault<z.ZodBoolean>;
    effectiveDate: z.ZodCoercedDate<unknown>;
    endDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    maxAnnualAmount: z.ZodOptional<z.ZodNumber>;
  },
  z.core.$strip
>;
export type Deduction = z.infer<typeof DeductionSchema>;
export declare const PayrollPeriodStatusEnum: z.ZodEnum<{
  failed: "failed";
  draft: "draft";
  approved: "approved";
  processing: "processing";
  pending_approval: "pending_approval";
  finalized: "finalized";
}>;
export declare const PayrollPeriodSchema: z.ZodObject<
  {
    id: z.ZodString;
    tenantId: z.ZodString;
    startDate: z.ZodCoercedDate<unknown>;
    endDate: z.ZodCoercedDate<unknown>;
    status: z.ZodDefault<
      z.ZodEnum<{
        failed: "failed";
        draft: "draft";
        approved: "approved";
        processing: "processing";
        pending_approval: "pending_approval";
        finalized: "finalized";
      }>
    >;
    currency: z.ZodDefault<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    updatedAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
  },
  z.core.$strip
>;
export type PayrollPeriod = z.infer<typeof PayrollPeriodSchema>;
export declare const DeductionLineSchema: z.ZodObject<
  {
    deductionId: z.ZodString;
    type: z.ZodEnum<{
      other: "other";
      benefits: "benefits";
      health_insurance: "health_insurance";
      dental_insurance: "dental_insurance";
      vision_insurance: "vision_insurance";
      retirement_401k: "retirement_401k";
      retirement_ira: "retirement_ira";
      garnishment: "garnishment";
      child_support: "child_support";
      union_dues: "union_dues";
      loan_repayment: "loan_repayment";
    }>;
    name: z.ZodString;
    amount: z.ZodNumber;
    isPreTax: z.ZodBoolean;
  },
  z.core.$strip
>;
export type DeductionLine = z.infer<typeof DeductionLineSchema>;
export declare const TaxWithholdingSchema: z.ZodObject<
  {
    type: z.ZodEnum<{
      other: "other";
      federal: "federal";
      state: "state";
      local: "local";
      social_security: "social_security";
      medicare: "medicare";
    }>;
    jurisdiction: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
  },
  z.core.$strip
>;
export type TaxWithholding = z.infer<typeof TaxWithholdingSchema>;
export declare const PayrollRecordSchema: z.ZodObject<
  {
    id: z.ZodString;
    tenantId: z.ZodString;
    periodId: z.ZodString;
    employeeId: z.ZodString;
    employeeName: z.ZodString;
    department: z.ZodOptional<z.ZodString>;
    roleName: z.ZodString;
    hoursRegular: z.ZodNumber;
    hoursOvertime: z.ZodNumber;
    regularPay: z.ZodNumber;
    overtimePay: z.ZodNumber;
    tips: z.ZodDefault<z.ZodNumber>;
    grossPay: z.ZodNumber;
    preTaxDeductions: z.ZodArray<
      z.ZodObject<
        {
          deductionId: z.ZodString;
          type: z.ZodEnum<{
            other: "other";
            benefits: "benefits";
            health_insurance: "health_insurance";
            dental_insurance: "dental_insurance";
            vision_insurance: "vision_insurance";
            retirement_401k: "retirement_401k";
            retirement_ira: "retirement_ira";
            garnishment: "garnishment";
            child_support: "child_support";
            union_dues: "union_dues";
            loan_repayment: "loan_repayment";
          }>;
          name: z.ZodString;
          amount: z.ZodNumber;
          isPreTax: z.ZodBoolean;
        },
        z.core.$strip
      >
    >;
    taxableIncome: z.ZodNumber;
    taxesWithheld: z.ZodArray<
      z.ZodObject<
        {
          type: z.ZodEnum<{
            other: "other";
            federal: "federal";
            state: "state";
            local: "local";
            social_security: "social_security";
            medicare: "medicare";
          }>;
          jurisdiction: z.ZodOptional<z.ZodString>;
          amount: z.ZodNumber;
        },
        z.core.$strip
      >
    >;
    totalTaxes: z.ZodNumber;
    postTaxDeductions: z.ZodArray<
      z.ZodObject<
        {
          deductionId: z.ZodString;
          type: z.ZodEnum<{
            other: "other";
            benefits: "benefits";
            health_insurance: "health_insurance";
            dental_insurance: "dental_insurance";
            vision_insurance: "vision_insurance";
            retirement_401k: "retirement_401k";
            retirement_ira: "retirement_ira";
            garnishment: "garnishment";
            child_support: "child_support";
            union_dues: "union_dues";
            loan_repayment: "loan_repayment";
          }>;
          name: z.ZodString;
          amount: z.ZodNumber;
          isPreTax: z.ZodBoolean;
        },
        z.core.$strip
      >
    >;
    totalDeductions: z.ZodNumber;
    netPay: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    auditId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
  },
  z.core.$strip
>;
export type PayrollRecord = z.infer<typeof PayrollRecordSchema>;
export declare const PayrollAuditSchema: z.ZodObject<
  {
    id: z.ZodString;
    tenantId: z.ZodString;
    periodId: z.ZodString;
    action: z.ZodEnum<{
      approved: "approved";
      generated: "generated";
      recalculated: "recalculated";
      exported: "exported";
      voided: "voided";
    }>;
    userId: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodCoercedDate<unknown>;
    inputSnapshot: z.ZodOptional<z.ZodAny>;
    rulesVersion: z.ZodOptional<z.ZodString>;
    resultSummary: z.ZodOptional<
      z.ZodObject<
        {
          totalEmployees: z.ZodNumber;
          totalGrossPay: z.ZodNumber;
          totalNetPay: z.ZodNumber;
          totalTaxes: z.ZodNumber;
          totalDeductions: z.ZodNumber;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type PayrollAudit = z.infer<typeof PayrollAuditSchema>;
export declare const PayrollCalculationInputSchema: z.ZodObject<
  {
    tenantId: z.ZodString;
    periodId: z.ZodString;
    periodStart: z.ZodCoercedDate<unknown>;
    periodEnd: z.ZodCoercedDate<unknown>;
    employees: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          tenantId: z.ZodString;
          name: z.ZodString;
          department: z.ZodOptional<z.ZodString>;
          roleId: z.ZodString;
          currency: z.ZodDefault<z.ZodString>;
          hourlyRate: z.ZodNumber;
          taxInfo: z.ZodOptional<
            z.ZodObject<
              {
                jurisdiction: z.ZodString;
                status: z.ZodEnum<{
                  single: "single";
                  married: "married";
                  head_of_household: "head_of_household";
                }>;
                federalWithholdingAllowances: z.ZodDefault<z.ZodNumber>;
                stateWithholdingAllowances: z.ZodDefault<z.ZodNumber>;
                additionalWithholding: z.ZodDefault<z.ZodNumber>;
              },
              z.core.$strip
            >
          >;
          payrollPrefs: z.ZodOptional<
            z.ZodObject<
              {
                payPeriodFrequency: z.ZodEnum<{
                  weekly: "weekly";
                  biweekly: "biweekly";
                  semimonthly: "semimonthly";
                  monthly: "monthly";
                }>;
                roundingRule: z.ZodDefault<
                  z.ZodEnum<{
                    none: "none";
                    nearest_quarter: "nearest_quarter";
                    nearest_tenth: "nearest_tenth";
                  }>
                >;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    roles: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          tenantId: z.ZodString;
          name: z.ZodString;
          baseRate: z.ZodNumber;
          overtimeMultiplier: z.ZodDefault<z.ZodNumber>;
          overtimeThresholdHours: z.ZodDefault<z.ZodNumber>;
        },
        z.core.$strip
      >
    >;
    timeEntries: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          tenantId: z.ZodString;
          employeeId: z.ZodString;
          date: z.ZodCoercedDate<unknown>;
          hoursWorked: z.ZodNumber;
          hoursRegular: z.ZodNumber;
          hoursOvertime: z.ZodDefault<z.ZodNumber>;
          approved: z.ZodDefault<z.ZodBoolean>;
        },
        z.core.$strip
      >
    >;
    tipPools: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            tenantId: z.ZodString;
            periodId: z.ZodString;
            totalTips: z.ZodNumber;
            allocationRule: z.ZodEnum<{
              by_hours: "by_hours";
              by_headcount: "by_headcount";
              fixed_shares: "fixed_shares";
            }>;
            fixedShares: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
          },
          z.core.$strip
        >
      >
    >;
    deductions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            tenantId: z.ZodString;
            employeeId: z.ZodString;
            type: z.ZodEnum<{
              other: "other";
              benefits: "benefits";
              health_insurance: "health_insurance";
              dental_insurance: "dental_insurance";
              vision_insurance: "vision_insurance";
              retirement_401k: "retirement_401k";
              retirement_ira: "retirement_ira";
              garnishment: "garnishment";
              child_support: "child_support";
              union_dues: "union_dues";
              loan_repayment: "loan_repayment";
            }>;
            name: z.ZodString;
            amount: z.ZodOptional<z.ZodNumber>;
            percentage: z.ZodOptional<z.ZodNumber>;
            isPreTax: z.ZodDefault<z.ZodBoolean>;
            effectiveDate: z.ZodCoercedDate<unknown>;
            endDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
            maxAnnualAmount: z.ZodOptional<z.ZodNumber>;
          },
          z.core.$strip
        >
      >
    >;
    jurisdiction: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export type PayrollCalculationInput = z.infer<
  typeof PayrollCalculationInputSchema
>;
export declare const GeneratePayrollRequestSchema: z.ZodObject<
  {
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    jurisdiction: z.ZodOptional<z.ZodString>;
    regenerateOnDataChange: z.ZodDefault<z.ZodBoolean>;
  },
  z.core.$strip
>;
export type GeneratePayrollRequest = z.infer<
  typeof GeneratePayrollRequestSchema
>;
export declare const GeneratePayrollResponseSchema: z.ZodObject<
  {
    batchId: z.ZodString;
    status: z.ZodEnum<{
      failed: "failed";
      completed: "completed";
      processing: "processing";
    }>;
    periodId: z.ZodString;
    estimatedTotals: z.ZodObject<
      {
        totalGross: z.ZodNumber;
        totalNet: z.ZodNumber;
        totalTaxes: z.ZodNumber;
        totalDeductions: z.ZodNumber;
        employeeCount: z.ZodNumber;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
>;
export type GeneratePayrollResponse = z.infer<
  typeof GeneratePayrollResponseSchema
>;
export declare const ExportFormat: z.ZodEnum<{
  json: "json";
  csv: "csv";
  qbxml: "qbxml";
  qbOnlineCsv: "qbOnlineCsv";
}>;
export type ExportFormatType = z.infer<typeof ExportFormat>;
//# sourceMappingURL=index.d.ts.map
