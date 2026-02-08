import { ReportInput, SalesRecord } from './types';
import { parseFiles } from './parsers';
import { calculateWeeklyMetrics, calculateMonthlyMetrics, calculateQuarterlyMetrics } from './calculators';
import { generateWeeklyPdf, generateMonthlyPdf, generateQuarterlyPdf } from './pdf';

export { ReportInput, ReportConfig, FileInput, SalesRecord } from './types';

export async function generateSalesReport(input: ReportInput): Promise<Buffer> {
  const { files, config } = input;

  if (!files || files.length === 0) {
    throw new Error('At least one data file is required');
  }

  if (!config.dateRange?.start || !config.dateRange?.end) {
    throw new Error('dateRange with start and end is required in config');
  }

  const allRecords = parseFiles(files);

  if (allRecords.length === 0) {
    throw new Error('No valid sales records found in the provided files');
  }

  const start = new Date(config.dateRange.start);
  const end = new Date(config.dateRange.end);
  end.setHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date range provided');
  }

  switch (config.reportType) {
    case 'weekly': {
      const metrics = calculateWeeklyMetrics(allRecords, start, end);
      return generateWeeklyPdf(metrics, config);
    }
    case 'monthly': {
      const metrics = calculateMonthlyMetrics(allRecords, start, end);
      return generateMonthlyPdf(metrics, config);
    }
    case 'quarterly': {
      const metrics = calculateQuarterlyMetrics(allRecords, start, end);
      return generateQuarterlyPdf(metrics, config);
    }
    default:
      throw new Error(`Unsupported report type: ${config.reportType}`);
  }
}
