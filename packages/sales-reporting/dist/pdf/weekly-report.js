"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklyPdf = generateWeeklyPdf;
const document_1 = require("./document");
const components_1 = require("./components");
const charts_1 = require("../charts");
const formatting_1 = require("../utils/formatting");
const date_1 = require("../utils/date");
async function generateWeeklyPdf(metrics, config) {
    const doc = (0, document_1.createDocument)();
    const companyName = config.companyName || 'Sales Report';
    const dateRange = `${(0, date_1.formatDateShort)(metrics.dateRange.start)} — ${(0, date_1.formatDateShort)(metrics.dateRange.end)}`;
    let y = (0, document_1.drawHeader)(doc, companyName, 'Weekly Sales Report', dateRange);
    y = (0, components_1.drawMetricCards)(doc, y, [
        {
            label: 'Leads Received',
            value: String(metrics.leadsReceived),
        },
        {
            label: 'Proposals Sent',
            value: String(metrics.proposalsSent),
        },
        {
            label: 'Events Closed',
            value: String(metrics.eventsClosed),
        },
        {
            label: 'Closing Ratio',
            value: (0, formatting_1.formatPercent)(metrics.closingRatio),
        },
    ]);
    y += 5;
    const eventTypes = Object.entries(metrics.revenueByEventType);
    if (eventTypes.length > 0) {
        y = (0, components_1.drawSectionTitle)(doc, 'Revenue by Event Type', y);
        y = (0, charts_1.drawBarChart)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            height: 200,
            data: eventTypes
                .sort((a, b) => b[1] - a[1])
                .map(([label, value]) => ({ label, value })),
            title: '',
            showCurrency: true,
        });
    }
    y += 5;
    if (metrics.lostOpportunities.count > 0) {
        y = (0, components_1.drawSectionTitle)(doc, 'Lost Opportunities', y);
        y = (0, components_1.drawMetricCards)(doc, y, [
            {
                label: 'Deals Lost',
                value: String(metrics.lostOpportunities.count),
                trend: 'down',
            },
            {
                label: 'Revenue Lost',
                value: (0, formatting_1.formatCurrencyFull)(metrics.lostOpportunities.totalValue),
                trend: 'down',
            },
        ], 2);
    }
    if (metrics.topPendingDeals.length > 0) {
        y += 5;
        y = (0, components_1.drawSectionTitle)(doc, 'Top Pending Deals', y);
        y = (0, components_1.drawTable)(doc, {
            x: document_1.PAGE.margin,
            y,
            width: document_1.PAGE.contentWidth,
            columns: [
                { header: 'Event', width: 180 },
                { header: 'Client', width: 120 },
                { header: 'Type', width: 90 },
                { header: 'Value', width: 80, align: 'right' },
                { header: 'Status', width: 42, align: 'center' },
            ],
            rows: metrics.topPendingDeals.map(d => [
                (0, formatting_1.truncateText)(d.eventName, 28),
                (0, formatting_1.truncateText)(d.clientName, 18),
                (0, formatting_1.truncateText)(d.eventType, 14),
                (0, formatting_1.formatCurrencyFull)(d.revenue),
                d.status === 'proposal_sent' ? 'Prop.' : 'Pend.',
            ]),
        });
    }
    (0, document_1.drawPageFooter)(doc);
    return (0, document_1.collectBuffer)(doc);
}
//# sourceMappingURL=weekly-report.js.map