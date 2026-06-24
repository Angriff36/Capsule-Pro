import type { Employee, TaxWithholding } from "../models";
import { Currency, money } from "./currency";

/**
 * Tax calculation configuration
 * Rates are for 2026 - should be updated annually or loaded from external source
 */

// Federal Tax Brackets 2026 (Single) - IRS Revenue Procedure 2025-53
const FEDERAL_TAX_BRACKETS_SINGLE = [
  { min: 0, max: 11_725, rate: 0.1 },
  { min: 11_725, max: 47_525, rate: 0.12 },
  { min: 47_525, max: 101_175, rate: 0.22 },
  { min: 101_175, max: 193_250, rate: 0.24 },
  { min: 193_250, max: 245_650, rate: 0.32 },
  { min: 245_650, max: 609_300, rate: 0.35 },
  { min: 609_300, max: Number.POSITIVE_INFINITY, rate: 0.37 },
];

// Federal Tax Brackets 2026 (Married Filing Jointly) - IRS Revenue Procedure 2025-53
const FEDERAL_TAX_BRACKETS_MARRIED = [
  { min: 0, max: 23_450, rate: 0.1 },
  { min: 23_450, max: 95_050, rate: 0.12 },
  { min: 95_050, max: 202_350, rate: 0.22 },
  { min: 202_350, max: 386_500, rate: 0.24 },
  { min: 386_500, max: 491_300, rate: 0.32 },
  { min: 491_300, max: 731_200, rate: 0.35 },
  { min: 731_200, max: Number.POSITIVE_INFINITY, rate: 0.37 },
];

// Federal Tax Brackets 2026 (Head of Household) - IRS Revenue Procedure 2025-53
const FEDERAL_TAX_BRACKETS_HOH = [
  { min: 0, max: 16_700, rate: 0.1 },
  { min: 16_700, max: 63_700, rate: 0.12 },
  { min: 63_700, max: 100_700, rate: 0.22 },
  { min: 100_700, max: 192_950, rate: 0.24 },
  { min: 192_950, max: 245_350, rate: 0.32 },
  { min: 245_350, max: 591_350, rate: 0.35 },
  { min: 591_350, max: Number.POSITIVE_INFINITY, rate: 0.37 },
];

// FICA Rates 2026
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 176_100; // 2026 wage base increase
const MEDICARE_RATE = 0.0145;
const MEDICARE_ADDITIONAL_RATE = 0.009;
const MEDICARE_ADDITIONAL_THRESHOLD_SINGLE = 200_000;
const MEDICARE_ADDITIONAL_THRESHOLD_MARRIED = 250_000;

// Standard deduction for annualized calculations (2026)
const STANDARD_DEDUCTION_SINGLE = 15_000;
const STANDARD_DEDUCTION_MARRIED = 30_000;
const STANDARD_DEDUCTION_HOH = 22_500;

/**
 * State tax configuration - basic flat rates for common states
 * In production, this would be a more comprehensive lookup or API call
 */
const STATE_TAX_RATES: Record<
  string,
  {
    type: "flat" | "progressive";
    rate?: number;
    brackets?: Array<{ min: number; max: number; rate: number }>;
  }
> = {
  CA: {
    type: "progressive",
    brackets: [
      { min: 0, max: 10_412, rate: 0.01 },
      { min: 10_412, max: 24_684, rate: 0.02 },
      { min: 24_684, max: 38_959, rate: 0.04 },
      { min: 38_959, max: 54_081, rate: 0.06 },
      { min: 54_081, max: 68_350, rate: 0.08 },
      { min: 68_350, max: 349_137, rate: 0.093 },
      { min: 349_137, max: 418_961, rate: 0.103 },
      { min: 418_961, max: 698_271, rate: 0.113 },
      { min: 698_271, max: Number.POSITIVE_INFINITY, rate: 0.123 },
    ],
  },
  NY: {
    type: "progressive",
    brackets: [
      { min: 0, max: 8500, rate: 0.04 },
      { min: 8500, max: 11_700, rate: 0.045 },
      { min: 11_700, max: 13_900, rate: 0.0525 },
      { min: 13_900, max: 80_650, rate: 0.0585 },
      { min: 80_650, max: 215_400, rate: 0.0625 },
      { min: 215_400, max: 1_077_550, rate: 0.0685 },
      { min: 1_077_550, max: Number.POSITIVE_INFINITY, rate: 0.0965 },
    ],
  },
  TX: { type: "flat", rate: 0 },
  FL: { type: "flat", rate: 0 },
  WA: { type: "flat", rate: 0 },
  PA: { type: "flat", rate: 0.0307 },
  IL: { type: "flat", rate: 0.0495 },
  OH: {
    type: "progressive",
    brackets: [
      { min: 0, max: 26_050, rate: 0 },
      { min: 26_050, max: 100_000, rate: 0.027_65 },
      { min: 100_000, max: Number.POSITIVE_INFINITY, rate: 0.036_88 },
    ],
  },
};

// Pay periods per year for annualization
type PayPeriodFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

const PAY_PERIODS_PER_YEAR: Record<PayPeriodFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export interface TaxCalculationInput {
  employee: Employee;
  grossPay: Currency;
  payPeriodFrequency?: PayPeriodFrequency;
  preTaxDeductions: Currency;
  ytdGrossPay?: Currency;
  ytdSocialSecurityWages?: Currency;
}

export interface TaxCalculationResult {
  taxableIncome: Currency;
  totalTax: Currency;
  withholdings: TaxWithholding[];
}

/**
 * Calculate progressive tax using bracket system
 */
function calculateProgressiveTax(
  annualIncome: number,
  brackets: Array<{ min: number; max: number; rate: number }>
): number {
  let tax = 0;
  for (const bracket of brackets) {
    if (annualIncome > bracket.min) {
      const taxableInBracket =
        Math.min(annualIncome, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }
  }
  return tax;
}

/**
 * Main tax calculation engine
 * Computes federal, state, and FICA taxes
 */
export function calculateTaxes(
  input: TaxCalculationInput
): TaxCalculationResult {
  const {
    grossPay,
    preTaxDeductions,
    employee,
    ytdSocialSecurityWages = Currency.zero(),
    payPeriodFrequency = "biweekly",
  } = input;

  const taxInfo = employee.taxInfo;
  const periodsPerYear = PAY_PERIODS_PER_YEAR[payPeriodFrequency];
  const withholdings: TaxWithholding[] = [];

  // Calculate taxable income for this period
  const taxableIncome = grossPay.subtract(preTaxDeductions).nonNegative();

  // Annualize income for bracket calculations
  const annualTaxableIncome = taxableIncome.multiply(periodsPerYear).toNumber();

  // Get tax status and determine filing category
  const status = taxInfo?.status || "single";
  const isMarried = status === "married";
  const isHOH = status === "head_of_household";

  // Apply standard deduction based on filing status
  let standardDeduction: number;
  let federalBrackets: Array<{ min: number; max: number; rate: number }>;

  if (isMarried) {
    standardDeduction = STANDARD_DEDUCTION_MARRIED;
    federalBrackets = FEDERAL_TAX_BRACKETS_MARRIED;
  } else if (isHOH) {
    standardDeduction = STANDARD_DEDUCTION_HOH;
    federalBrackets = FEDERAL_TAX_BRACKETS_HOH;
  } else {
    standardDeduction = STANDARD_DEDUCTION_SINGLE;
    federalBrackets = FEDERAL_TAX_BRACKETS_SINGLE;
  }

  const adjustedAnnualIncome = Math.max(
    0,
    annualTaxableIncome - standardDeduction
  );

  // 1. Federal Income Tax
  const annualFederalTax = calculateProgressiveTax(
    adjustedAnnualIncome,
    federalBrackets
  );
  const periodFederalTax = money(annualFederalTax / periodsPerYear);

  // Add additional withholding if specified
  const additionalWithholding = money(taxInfo?.additionalWithholding || 0);
  const totalFederalTax = periodFederalTax.add(additionalWithholding);

  withholdings.push({
    type: "federal",
    amount: totalFederalTax.toNumber(),
  });

  // 2. Social Security Tax (OASDI)
  const currentYtdSS = ytdSocialSecurityWages.toNumber();
  const remainingSsWages = Math.max(
    0,
    SOCIAL_SECURITY_WAGE_BASE - currentYtdSS
  );
  const ssWagesThisPeriod = Math.min(grossPay.toNumber(), remainingSsWages);
  const socialSecurityTax = money(ssWagesThisPeriod * SOCIAL_SECURITY_RATE);

  withholdings.push({
    type: "social_security",
    amount: socialSecurityTax.toNumber(),
  });

  // 3. Medicare Tax (including Additional Medicare Tax)
  const annualGross = grossPay.multiply(periodsPerYear).toNumber();
  const medicareThreshold = isMarried
    ? MEDICARE_ADDITIONAL_THRESHOLD_MARRIED
    : MEDICARE_ADDITIONAL_THRESHOLD_SINGLE;

  // Base Medicare tax (1.45%)
  const baseMedicareTax = grossPay.multiply(MEDICARE_RATE);

  // Additional Medicare tax (0.9% on wages over threshold)
  let additionalMedicareTax = Currency.zero();
  if (annualGross > medicareThreshold) {
    const excessAmount = annualGross - medicareThreshold;
    const excessPerPeriod = excessAmount / periodsPerYear;
    additionalMedicareTax = money(excessPerPeriod * MEDICARE_ADDITIONAL_RATE);
  }

  const medicareTax = baseMedicareTax.add(additionalMedicareTax);

  withholdings.push({
    type: "medicare",
    amount: medicareTax.toNumber(),
  });

  // 4. State Income Tax
  const jurisdiction = taxInfo?.jurisdiction || "FL"; // Default to no state tax
  const stateConfig = STATE_TAX_RATES[jurisdiction.toUpperCase()];

  if (stateConfig) {
    let stateTax: Currency;
    if (stateConfig.type === "flat") {
      stateTax = taxableIncome.multiply(stateConfig.rate || 0);
    } else if (stateConfig.brackets) {
      const annualStateTax = calculateProgressiveTax(
        annualTaxableIncome,
        stateConfig.brackets
      );
      stateTax = money(annualStateTax / periodsPerYear);
    } else {
      stateTax = Currency.zero();
    }

    if (stateTax.toNumber() > 0) {
      withholdings.push({
        type: "state",
        jurisdiction: jurisdiction.toUpperCase(),
        amount: stateTax.toNumber(),
      });
    }
  }

  // Calculate total taxes
  const totalTax = withholdings.reduce(
    (sum, w) => sum.add(money(w.amount)),
    Currency.zero()
  );

  return {
    taxableIncome,
    withholdings,
    totalTax,
  };
}

/**
 * Get the FICA tax rates
 */
export function getFicaRates() {
  return {
    socialSecurityRate: SOCIAL_SECURITY_RATE,
    socialSecurityWageBase: SOCIAL_SECURITY_WAGE_BASE,
    medicareRate: MEDICARE_RATE,
    medicareAdditionalRate: MEDICARE_ADDITIONAL_RATE,
  };
}

/**
 * Get supported jurisdictions
 */
export function getSupportedJurisdictions(): string[] {
  return Object.keys(STATE_TAX_RATES);
}
