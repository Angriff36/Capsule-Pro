"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMonthlyPdf = generateMonthlyPdf;
const types_1 = require("../types");
const document_1 = require("./document");
const components_1 = require("./components");
const charts_1 = require("../charts");
const formatting_1 = require("../utils/formatting");
const date_1 = require("../utils/date");
function revenueChangeText(current, previous) {
    if (previous === null)
        return { text: 'No prior data', trend: 'neutral' };
    if (previous === 0)
        return { text: 'New period', trend: 'neutral' };
    const pct = ((current - previous) / previous * 100).toFixed(1);
    if (current >= previous)
        return { text: `+${pct}% vs prior`, trend: 'up' };
    return { text: `${pct}% vs prior`, trend: 'down' };
}
async function generateMonthlyPdf(metrics, config) {
    const doc = (0, document_1.createDocument)();
    const companyName = config.companyName || 'Sales Report';
    const dateRange = (0, date_1.formatMonthYear)(metrics.dateRange.start);
    let y = (0, document_1.drawHeader)(doc, companyName, 'Monthly Sales Report', dateRange);
    const momChange = revenueChangeText(metrics.totalRevenue, metrics.previousMonthRevenue);
    const yoyChange = revenueChangeText(metrics.totalRevenue, metrics.yearOverYearRevenue);
    y = (0, components_1.drawMetricCards)(doc, y, [
        {
            label: 'Total Revenue',
            value: (0, formatting_1.formatCurrencyFull)(metrics.totalRevenue),
            subtext: momChange.text,
            trend: momChange.trend,
        },
        {
            label: 'Avg Event Value',
            value: (0, formatting_1.formatCurrencyFull)(metrics.avgEventValue),
        },
        {
            label: 'Year-over-Year',
            value: metrics.yearOverYearRevenue !== null
                ? (0, formatting_1.formatCurrencyFull)(metrics.yearOverYearRevenue)
                : 'N/A',
            subtext: yoyChange.text,
            trend: yoyChange.trend,
        },
        {
            label: 'Pipeline Value',
            value: (0, formatting_1.formatCurrencyFull)(metrics.pipelineForecast.pendingValue),
            subtext: `${metrics.pipelineForecast.pendingCount} deals pending`,
        },
    ]);
    y += 8;
    const sources = Object.entries(metrics.leadSourceBreakdown);
    if (sources.length > 0) {
        y = (0, components_1.drawSectionTitle)(doc, 'Lead Source Breakdown', y);
        y = (0, charts_1.drawBarChart)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            height: 190,
            data: sources
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([label, data]) => ({ label, value: data.revenue })),
            title: '',
            showCurrency: true,
        });
    }
    y = (0, document_1.addPageBreak)(doc);
    y = (0, components_1.drawSectionTitle)(doc, 'Sales Funnel', y);
    y = (0, charts_1.drawFunnelChart)(doc, {
        x: document_1.PAGE.margin,
        y,
        width: document_1.PAGE.contentWidth,
        height: 200,
        stages: [
            { label: 'Leads', value: metrics.funnelMetrics.leads },
            { label: 'Proposals', value: metrics.funnelMetrics.proposals },
            { label: 'Won', value: metrics.funnelMetrics.won },
        ],
        title: '',
    });
    y += 10;
    if (metrics.winLossTrends.length > 0) {
        y = (0, components_1.drawSectionTitle)(doc, 'Win/Loss Trends', y);
        y = (0, charts_1.drawLineChart)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            height: 200,
            series: [
                {
                    label: 'Wins',
                    data: metrics.winLossTrends.map(t => ({ label: t.period, value: t.wins })),
                    color: types_1.COLORS.green,
                },
                {
                    label: 'Losses',
                    data: metrics.winLossTrends.map(t => ({ label: t.period, value: t.losses })),
                    color: types_1.COLORS.red,
                },
            ],
            title: '',
        });
    }
    if (metrics.pipelineForecast.deals.length > 0) {
        y = (0, document_1.addPageBreak)(doc);
        y = (0, components_1.drawSectionTitle)(doc, 'Pipeline Forecast', y);
        y = (0, components_1.drawMetricCards)(doc, y, [
            {
                label: 'Pending Deals',
                value: String(metrics.pipelineForecast.pendingCount),
            },
            {
                label: 'Total Pipeline',
                value: (0, formatting_1.formatCurrencyFull)(metrics.pipelineForecast.pendingValue),
            },
            {
                label: 'Weighted Forecast',
                value: (0, formatting_1.formatCurrencyFull)(metrics.pipelineForecast.weightedForecast),
                subtext: 'Based on historical close rate',
            },
        ], 3);
        y += 10;
        y = (0, components_1.drawTable)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            columns: [
                { header: 'Event', width: 170 },
                { header: 'Client', width: 120 },
                { header: 'Source', width: 90 },
                { header: 'Value', width: 80, align: 'right' },
                { header: 'Status', width: 52, align: 'center' },
            ],
            rows: metrics.pipelineForecast.deals.map(d => [
                (0, formatting_1.truncateText)(d.eventName, 26),
                (0, formatting_1.truncateText)(d.clientName, 18),
                (0, formatting_1.truncateText)(d.leadSource, 14),
                (0, formatting_1.formatCurrencyFull)(d.revenue),
                d.status === 'proposal_sent' ? 'Prop.' : 'Pend.',
            ]),
        });
    }
    if (sources.length > 0) {
        y = (0, components_1.ensureSpace)(doc, y, 180);
        y = (0, components_1.drawSectionTitle)(doc, 'Lead Source Detail', y);
        y = (0, components_1.drawTable)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            columns: [
                { header: 'Source', width: 130 },
                { header: 'Leads', width: 80, align: 'center' },
                { header: 'Revenue', width: 120, align: 'right' },
                { header: 'Conv. Rate', width: 100, align: 'right' },
                { header: 'Rev/Lead', width: 82, align: 'right' },
            ],
            rows: sources
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
    (0, document_1.drawPageFooter)(doc);
    return (0, document_1.collectBuffer)(doc);
}
//# sourceMappingURL=monthly-report.js.map