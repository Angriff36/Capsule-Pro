import type { PayrollPeriod, PayrollRecord } from "../models";
/**
 * CSV Export Configuration
 */
export interface CsvExportOptions {
  includeHeader?: boolean;
  delimiter?: string;
  dateFormat?: "iso" | "us" | "qb";
  maskSensitiveData?: boolean;
  customColumns?: string[];
}
/**
 * Export payroll records to CSV format
 */
export declare function exportToCSV(
  records: PayrollRecord[],
  period: PayrollPeriod,
  options?: CsvExportOptions
): string;
/**
 * Export payroll summary to CSV
 */
export declare function exportSummaryToCSV(
  summary: {
    totalEmployees: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalTaxes: number;
    totalDeductions: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalTips: number;
  },
  period: PayrollPeriod,
  options?: CsvExportOptions
): string;
//# sourceMappingURL=csvExport.d.ts.map
