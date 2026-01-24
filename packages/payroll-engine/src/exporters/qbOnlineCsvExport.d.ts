import type { PayrollPeriod, PayrollRecord } from "../models";
/**
 * QuickBooks Online CSV Export Configuration
 */
export interface QBOnlineCsvExportOptions {
  includeHeader?: boolean;
  dateFormat?: "us" | "iso";
  accountMappings?: QBOnlineAccountMappings;
}
/**
 * QuickBooks Online Account Mappings
 */
export interface QBOnlineAccountMappings {
  wagesAccount: string;
  overtimeAccount: string;
  tipsAccount: string;
  federalTaxAccount: string;
  stateTaxAccount: string;
  ficaAccount: string;
  benefitsAccount: string;
  retirementAccount: string;
  cashAccount: string;
}
/**
 * Export payroll to QuickBooks Online CSV format
 */
export declare function exportToQBOnlineCSV(
  records: PayrollRecord[],
  period: PayrollPeriod,
  options?: QBOnlineCsvExportOptions
): string;
/**
 * Export aggregate payroll journal entry to QBO CSV
 */
export declare function exportToQBOnlineCSVAggregate(
  records: PayrollRecord[],
  period: PayrollPeriod,
  options?: QBOnlineCsvExportOptions
): string;
//# sourceMappingURL=qbOnlineCsvExport.d.ts.map
