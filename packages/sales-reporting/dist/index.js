"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSalesReport = generateSalesReport;
const parsers_1 = require("./parsers");
const calculators_1 = require("./calculators");
const pdf_1 = require("./pdf");
async function generateSalesReport(input) {
    const { files, config } = input;
    if (!files || files.length === 0) {
        throw new Error('At least one data file is required');
    }
    if (!config.dateRange?.start || !config.dateRange?.end) {
        throw new Error('dateRange with start and end is required in config');
    }
    const allRecords = (0, parsers_1.parseFiles)(files);
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
            const metrics = (0, calculators_1.calculateWeeklyMetrics)(allRecords, start, end);
            return (0, pdf_1.generateWeeklyPdf)(metrics, config);
        }
        case 'monthly': {
            const metrics = (0, calculators_1.calculateMonthlyMetrics)(allRecords, start, end);
            return (0, pdf_1.generateMonthlyPdf)(metrics, config);
        }
        case 'quarterly': {
            const metrics = (0, calculators_1.calculateQuarterlyMetrics)(allRecords, start, end);
            return (0, pdf_1.generateQuarterlyPdf)(metrics, config);
        }
        default:
            throw new Error(`Unsupported report type: ${config.reportType}`);
    }
}
//# sourceMappingURL=index.js.map