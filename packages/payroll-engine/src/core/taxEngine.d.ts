import type { Employee, TaxWithholding } from "../models";
import { Currency } from "./currency";
export interface TaxCalculationInput {
  grossPay: Currency;
  preTaxDeductions: Currency;
  employee: Employee;
  ytdGrossPay?: Currency;
  ytdSocialSecurityWages?: Currency;
  payPeriodFrequency?: "weekly" | "biweekly" | "semimonthly" | "monthly";
}
export interface TaxCalculationResult {
  taxableIncome: Currency;
  withholdings: TaxWithholding[];
  totalTax: Currency;
}
/**
 * Main tax calculation engine
 * Computes federal, state, and FICA taxes
 */
export declare function calculateTaxes(
  input: TaxCalculationInput
): TaxCalculationResult;
/**
 * Get the FICA tax rates
 */
export declare function getFicaRates(): {
  socialSecurityRate: number;
  socialSecurityWageBase: number;
  medicareRate: number;
  medicareAdditionalRate: number;
};
/**
 * Get supported jurisdictions
 */
export declare function getSupportedJurisdictions(): string[];
//# sourceMappingURL=taxEngine.d.ts.map
