import type { PayrollPeriod, PayrollRecord } from "../models";
/**
 * QuickBooks Desktop XML Export Configuration
 */
export interface QBXMLExportOptions {
  companyName?: string;
  journalEntryPrefix?: string;
  accountMappings?: QBAccountMappings;
}
/**
 * QuickBooks GL Account Mappings
 */
export interface QBAccountMappings {
  wagesExpense: string;
  overtimeExpense: string;
  tipsExpense: string;
  federalTaxPayable: string;
  stateTaxPayable: string;
  socialSecurityPayable: string;
  medicarePayable: string;
  benefitsPayable: string;
  retirementPayable: string;
  garnishmentsPayable: string;
  cashAccount: string;
}
/**
 * Export payroll to QBXML format for QuickBooks Desktop
 */
export declare function exportToQBXML(
  records: PayrollRecord[],
  period: PayrollPeriod,
  options?: QBXMLExportOptions
): string;
/**
 * Create aggregate journal entry for entire payroll (single entry with multiple lines)
 */
export declare function exportToQBXMLAggregate(
  records: PayrollRecord[],
  period: PayrollPeriod,
  options?: QBXMLExportOptions
): string;
//# sourceMappingURL=qbxmlExport.d.ts.map
