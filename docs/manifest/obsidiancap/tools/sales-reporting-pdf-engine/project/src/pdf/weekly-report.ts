import PDFDocument from 'pdfkit';
import { WeeklyMetrics, ReportConfig, COLORS } from '../types';
import { createDocument, collectBuffer, drawHeader, drawPageFooter, PAGE } from './document';
import { drawMetricCards, drawSectionTitle, drawTable } from './components';
import { drawBarChart } from '../charts';
import { formatCurrencyFull, formatPercent, truncateText } from '../utils/formatting';
import { formatDateShort } from '../utils/date';

export async function generateWeeklyPdf(
  metrics: WeeklyMetrics,
  config: ReportConfig
): Promise<Buffer> {
  const doc = createDocument();
  const companyName = config.companyName || 'Sales Report';
  const dateRange = `${formatDateShort(metrics.dateRange.start)} — ${formatDateShort(metrics.dateRange.end)}`;

  let y = drawHeader(doc, companyName, 'Weekly Sales Report', dateRange);

  y = drawMetricCards(doc, y, [
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
      value: formatPercent(metrics.closingRatio),
    },
  ]);

  y += 5;

  const eventTypes = Object.entries(metrics.revenueByEventType);
  if (eventTypes.length > 0) {
    y = drawSectionTitle(doc, 'Revenue by Event Type', y);
    y = drawBarChart(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
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
    y = drawSectionTitle(doc, 'Lost Opportunities', y);
    y = drawMetricCards(doc, y, [
      {
        label: 'Deals Lost',
        value: String(metrics.lostOpportunities.count),
        trend: 'down',
      },
      {
        label: 'Revenue Lost',
        value: formatCurrencyFull(metrics.lostOpportunities.totalValue),
        trend: 'down',
      },
    ], 2);
  }

  if (metrics.topPendingDeals.length > 0) {
    y += 5;
    y = drawSectionTitle(doc, 'Top Pending Deals', y);
    y = drawTable(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
      columns: [
        { header: 'Event', width: 180 },
        { header: 'Client', width: 120 },
        { header: 'Type', width: 90 },
        { header: 'Value', width: 80, align: 'right' },
        { header: 'Status', width: 42, align: 'center' },
      ],
      rows: metrics.topPendingDeals.map(d => [
        truncateText(d.eventName, 28),
        truncateText(d.clientName, 18),
        truncateText(d.eventType, 14),
        formatCurrencyFull(d.revenue),
        d.status === 'proposal_sent' ? 'Prop.' : 'Pend.',
      ]),
    });
  }

  drawPageFooter(doc);
  return collectBuffer(doc);
}
