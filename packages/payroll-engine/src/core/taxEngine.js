Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaxes = calculateTaxes;
exports.getFicaRates = getFicaRates;
exports.getSupportedJurisdictions = getSupportedJurisdictions;
const currency_1 = require("./currency");
/**
 * Tax calculation configuration
 * Rates are for 2024 - should be updated annually or loaded from external source
 */
// Federal Tax Brackets 2024 (Single)
const FEDERAL_TAX_BRACKETS_SINGLE = [
  { min: 0, max: 11_600, rate: 0.1 },
  { min: 11_600, max: 47_150, rate: 0.12 },
  { min: 47_150, max: 100_525, rate: 0.22 },
  { min: 100_525, max: 191_950, rate: 0.24 },
  { min: 191_950, max: 243_725, rate: 0.32 },
  { min: 243_725, max: 609_350, rate: 0.35 },
  { min: 609_350, max: Number.POSITIVE_INFINITY, rate: 0.37 },
];
// Federal Tax Brackets 2024 (Married)
const FEDERAL_TAX_BRACKETS_MARRIED = [
  { min: 0, max: 23_200, rate: 0.1 },
  { min: 23_200, max: 94_300, rate: 0.12 },
  { min: 94_300, max: 201_050, rate: 0.22 },
  { min: 201_050, max: 383_900, rate: 0.24 },
  { min: 383_900, max: 487_450, rate: 0.32 },
  { min: 487_450, max: 731_200, rate: 0.35 },
  { min: 731_200, max: Number.POSITIVE_INFINITY, rate: 0.37 },
];
// FICA Rates 2024
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 168_600;
const MEDICARE_RATE = 0.0145;
const MEDICARE_ADDITIONAL_RATE = 0.009;
const MEDICARE_ADDITIONAL_THRESHOLD_SINGLE = 200_000;
const MEDICARE_ADDITIONAL_THRESHOLD_MARRIED = 250_000;
// Standard deduction for annualized calculations
const STANDARD_DEDUCTION_SINGLE = 14_600;
const STANDARD_DEDUCTION_MARRIED = 29_200;
/**
 * State tax configuration - basic flat rates for common states
 * In production, this would be a more comprehensive lookup or API call
 */
const STATE_TAX_RATES = {
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
const PAY_PERIODS_PER_YEAR = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};
/**
 * Calculate progressive tax using bracket system
 */
function calculateProgressiveTax(annualIncome, brackets) {
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
function calculateTaxes(input) {
  const {
    grossPay,
    preTaxDeductions,
    employee,
    ytdGrossPay = currency_1.Currency.zero(),
    ytdSocialSecurityWages = currency_1.Currency.zero(),
    payPeriodFrequency = "biweekly",
  } = input;
  const taxInfo = employee.taxInfo;
  const periodsPerYear = PAY_PERIODS_PER_YEAR[payPeriodFrequency];
  const withholdings = [];
  // Calculate taxable income for this period
  const taxableIncome = grossPay.subtract(preTaxDeductions).nonNegative();
  // Annualize income for bracket calculations
  const annualTaxableIncome = taxableIncome.multiply(periodsPerYear).toNumber();
  // Get tax status and brackets
  const status = taxInfo?.status || "single";
  const isMarried = status === "married";
  // Apply standard deduction for federal calculations
  const standardDeduction = isMarried
    ? STANDARD_DEDUCTION_MARRIED
    : STANDARD_DEDUCTION_SINGLE;
  const adjustedAnnualIncome = Math.max(
    0,
    annualTaxableIncome - standardDeduction
  );
  // 1. Federal Income Tax
  const federalBrackets = isMarried
    ? FEDERAL_TAX_BRACKETS_MARRIED
    : FEDERAL_TAX_BRACKETS_SINGLE;
  const annualFederalTax = calculateProgressiveTax(
    adjustedAnnualIncome,
    federalBrackets
  );
  const periodFederalTax = (0, currency_1.money)(
    annualFederalTax / periodsPerYear
  );
  // Add additional withholding if specified
  const additionalWithholding = (0, currency_1.money)(
    taxInfo?.additionalWithholding || 0
  );
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
  const socialSecurityTax = (0, currency_1.money)(
    ssWagesThisPeriod * SOCIAL_SECURITY_RATE
  );
  withholdings.push({
    type: "social_security",
    amount: socialSecurityTax.toNumber(),
  });
  // 3. Medicare Tax
  const annualGross = grossPay.multiply(periodsPerYear).toNumber();
  const medicareThreshold = isMarried
    ? MEDICARE_ADDITIONAL_THRESHOLD_MARRIED
    : MEDICARE_ADDITIONAL_THRESHOLD_SINGLE;
  let medicareRate = MEDICARE_RATE;
  if (annualGross > medicareThreshold) {
    // Apply additional Medicare tax on amounts over threshold
    const excessAmount = annualGross - medicareThreshold;
    const excessPerPeriod = excessAmount / periodsPerYear;
    const additionalMedicare = (0, currency_1.money)(
      excessPerPeriod * MEDICARE_ADDITIONAL_RATE
    );
    medicareRate = MEDICARE_RATE;
    // Note: Additional Medicare is calculated on annual basis
  }
  const medicareTax = grossPay.multiply(medicareRate);
  withholdings.push({
    type: "medicare",
    amount: medicareTax.toNumber(),
  });
  // 4. State Income Tax
  const jurisdiction = taxInfo?.jurisdiction || "FL"; // Default to no state tax
  const stateConfig = STATE_TAX_RATES[jurisdiction.toUpperCase()];
  if (stateConfig) {
    let stateTax;
    if (stateConfig.type === "flat") {
      stateTax = taxableIncome.multiply(stateConfig.rate || 0);
    } else if (stateConfig.brackets) {
      const annualStateTax = calculateProgressiveTax(
        annualTaxableIncome,
        stateConfig.brackets
      );
      stateTax = (0, currency_1.money)(annualStateTax / periodsPerYear);
    } else {
      stateTax = currency_1.Currency.zero();
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
    (sum, w) => sum.add((0, currency_1.money)(w.amount)),
    currency_1.Currency.zero()
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
function getFicaRates() {
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
function getSupportedJurisdictions() {
  return Object.keys(STATE_TAX_RATES);
}
