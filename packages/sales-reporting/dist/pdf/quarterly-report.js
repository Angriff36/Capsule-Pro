"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuarterlyPdf = generateQuarterlyPdf;
const types_1 = require("../types");
const document_1 = require("./document");
const components_1 = require("./components");
const charts_1 = require("../charts");
const formatting_1 = require("../utils/formatting");
const date_1 = require("../utils/date");
async function generateQuarterlyPdf(metrics, config) {
    const doc = (0, document_1.createDocument)();
    const companyName = config.companyName || 'Sales Report';
    const dateRange = `${(0, date_1.getQuarterLabel)(metrics.dateRange.start)}  |  ${(0, date_1.formatDateShort)(metrics.dateRange.start)} — ${(0, date_1.formatDateShort)(metrics.dateRange.end)}`;
    let y = (0, document_1.drawHeader)(doc, companyName, 'Quarterly Sales Report', dateRange);
    const totalDeals = Object.values(metrics.customerSegments)
        .reduce((sum, s) => sum + s.count, 0);
    const avgDealValue = totalDeals > 0 ? metrics.totalRevenue / totalDeals : 0;
    y = (0, components_1.drawMetricCards)(doc, y, [
        {
            label: 'Total Revenue',
            value: (0, formatting_1.formatCurrencyFull)(metrics.totalRevenue),
        },
        {
            label: 'Total Deals',
            value: (0, formatting_1.formatNumber)(totalDeals),
        },
        {
            label: 'Avg Sales Cycle',
            value: metrics.salesCycleLength.avg > 0 ? `${metrics.salesCycleLength.avg}d` : 'N/A',
            subtext: metrics.salesCycleLength.avg > 0
                ? `${metrics.salesCycleLength.min}d min / ${metrics.salesCycleLength.max}d max`
                : undefined,
        },
        {
            label: 'Avg Deal Value',
            value: (0, formatting_1.formatCurrencyFull)(avgDealValue),
        },
    ]);
    y += 8;
    const segments = Object.entries(metrics.customerSegments);
    if (segments.length > 0) {
        y = (0, components_1.drawSectionTitle)(doc, 'Customer Segment Analysis', y);
        y = (0, charts_1.drawBarChart)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            height: 200,
            data: segments
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([label, data]) => ({ label, value: data.revenue })),
            title: '',
            showCurrency: true,
        });
        y = (0, components_1.ensureSpace)(doc, y, 120);
        y = (0, components_1.drawTable)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            columns: [
                { header: 'Segment', width: 130 },
                { header: 'Deals', width: 70, align: 'center' },
                { header: 'Revenue', width: 110, align: 'right' },
                { header: 'Avg Value', width: 100, align: 'right' },
                { header: 'Cycle (days)', width: 102, align: 'right' },
            ],
            rows: segments
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([segment, data]) => [
                segment,
                String(data.count),
                (0, formatting_1.formatCurrencyFull)(data.revenue),
                (0, formatting_1.formatCurrencyFull)(data.avgValue),
                metrics.salesCycleLength.bySegment[segment]
                    ? String(metrics.salesCycleLength.bySegment[segment])
                    : 'N/A',
            ]),
        });
    }
    y = (0, document_1.addPageBreak)(doc);
    if (metrics.pricingTrends.length > 0) {
        y = (0, components_1.drawSectionTitle)(doc, 'Pricing Trends', y);
        y = (0, charts_1.drawLineChart)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            height: 210,
            series: [{
                    label: 'Avg Deal Value',
                    data: metrics.pricingTrends.map(t => ({ label: t.month, value: t.avgValue })),
                    color: types_1.COLORS.navy,
                }],
            title: '',
            showCurrency: true,
        });
    }
    y += 5;
    const referrals = Object.entries(metrics.referralPerformance);
    if (referrals.length > 0) {
        y = (0, components_1.ensureSpace)(doc, y, 160);
        y = (0, components_1.drawSectionTitle)(doc, 'Referral & Lead Source Performance', y);
        y = (0, components_1.drawTable)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            columns: [
                { header: 'Source', width: 130 },
                { header: 'Leads', width: 70, align: 'center' },
                { header: 'Revenue', width: 110, align: 'right' },
                { header: 'Conv. Rate', width: 100, align: 'right' },
                { header: 'Rev/Lead', width: 102, align: 'right' },
            ],
            rows: referrals
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([source, data]) => [
                source,
                String(data.count),
                (0, formatting_1.formatCurrencyFull)(data.revenue),
                (0, formatting_1.formatPercent)(data.conversionRate),
                data.count > 0 ? (0, formatting_1.formatCurrencyFull)(Math.round(data.revenue / data.count)) : '$0',
            ]),
        });
    }
    y = (0, document_1.addPageBreak)(doc);
    if (metrics.recommendations.length > 0) {
        y = (0, components_1.drawSectionTitle)(doc, 'Recommendations', y);
        y = (0, components_1.drawTextBlock)(doc, y, metrics.recommendations, types_1.COLORS.navy);
    }
    y += 15;
    y = (0, components_1.drawSectionTitle)(doc, 'Next Quarter Goals', y);
    y = (0, components_1.drawMetricCards)(doc, y, [
        {
            label: 'Revenue Target',
            value: (0, formatting_1.formatCurrencyFull)(metrics.nextQuarterGoals.revenueTarget),
            subtext: '+10% growth target',
            trend: 'up',
        },
        {
            label: 'Lead Target',
            value: (0, formatting_1.formatNumber)(metrics.nextQuarterGoals.leadTarget),
            subtext: 'To hit revenue goal',
        },
        {
            label: 'Conversion Target',
            value: (0, formatting_1.formatPercent)(metrics.nextQuarterGoals.conversionTarget),
            subtext: '+5pp improvement',
            trend: 'up',
        },
    ], 3);
    (0, document_1.drawPageFooter)(doc);
    return (0, document_1.collectBuffer)(doc);
}
//# sourceMappingURL=quarterly-report.js.map