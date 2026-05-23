import PDFDocument from 'pdfkit';
import { MonthlyMetrics, ReportConfig, COLORS } from '../types';
import { createDocument, collectBuffer, drawHeader, drawPageFooter, addPageBreak, PAGE } from './document';
import { drawMetricCards, drawSectionTitle, drawTable, ensureSpace } from './components';
import { drawBarChart, drawLineChart, drawFunnelChart } from '../charts';
import { formatCurrencyFull, formatPercent, truncateText, formatNumber } from '../utils/formatting';
import { formatMonthYear } from '../utils/date';

function revenueChangeText(current: number, previous: number | null): { text: string; trend: 'up' | 'down' | 'neutral' } {
  if (previous === null) return { text: 'No prior data', trend: 'neutral' };
  if (previous === 0) return { text: 'New period', trend: 'neutral' };
  const pct = ((current - previous) / previous * 100).toFixed(1);
  if (current >= previous) return { text: `+${pct}% vs prior`, trend: 'up' };
  return { text: `${pct}% vs prior`, trend: 'down' };
}

export async function generateMonthlyPdf(
  metrics: MonthlyMetrics,
  config: ReportConfig
): Promise<Buffer> {
  const doc = createDocument();
  const companyName = config.companyName || 'Sales Report';
  const dateRange = formatMonthYear(metrics.dateRange.start);

  let y = drawHeader(doc, companyName, 'Monthly Sales Report', dateRange);

  const momChange = revenueChangeText(metrics.totalRevenue, metrics.previousMonthRevenue);
  const yoyChange = revenueChangeText(metrics.totalRevenue, metrics.yearOverYearRevenue);

  y = drawMetricCards(doc, y, [
    {
      label: 'Total Revenue',
      value: formatCurrencyFull(metrics.totalRevenue),
      subtext: momChange.text,
      trend: momChange.trend,
    },
    {
      label: 'Avg Event Value',
      value: formatCurrencyFull(metrics.avgEventValue),
    },
    {
      label: 'Year-over-Year',
      value: metrics.yearOverYearRevenue !== null
        ? formatCurrencyFull(metrics.yearOverYearRevenue)
        : 'N/A',
      subtext: yoyChange.text,
      trend: yoyChange.trend,
    },
    {
      label: 'Pipeline Value',
      value: formatCurrencyFull(metrics.pipelineForecast.pendingValue),
      subtext: `${metrics.pipelineForecast.pendingCount} deals pending`,
    },
  ]);

  y += 8;

  const sources = Object.entries(metrics.leadSourceBreakdown);
  if (sources.length > 0) {
    y = drawSectionTitle(doc, 'Lead Source Breakdown', y);
    y = drawBarChart(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
      height: 190,
      data: sources
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([label, data]) => ({ label, value: data.revenue })),
      title: '',
      showCurrency: true,
    });
  }

  y = addPageBreak(doc);
  y = drawSectionTitle(doc, 'Sales Funnel', y);
  y = drawFunnelChart(doc, {
    x: PAGE.margin,
    y,
    width: PAGE.contentWidth,
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
    y = drawSectionTitle(doc, 'Win/Loss Trends', y);
    y = drawLineChart(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
      height: 200,
      series: [
        {
          label: 'Wins',
          data: metrics.winLossTrends.map(t => ({ label: t.period, value: t.wins })),
          color: COLORS.green,
        },
        {
          label: 'Losses',
          data: metrics.winLossTrends.map(t => ({ label: t.period, value: t.losses })),
          color: COLORS.red,
        },
      ],
      title: '',
    });
  }

  if (metrics.pipelineForecast.deals.length > 0) {
    y = addPageBreak(doc);
    y = drawSectionTitle(doc, 'Pipeline Forecast', y);

    y = drawMetricCards(doc, y, [
      {
        label: 'Pending Deals',
        value: String(metrics.pipelineForecast.pendingCount),
      },
      {
        label: 'Total Pipeline',
        value: formatCurrencyFull(metrics.pipelineForecast.pendingValue),
      },
      {
        label: 'Weighted Forecast',
        value: formatCurrencyFull(metrics.pipelineForecast.weightedForecast),
        subtext: 'Based on historical close rate',
      },
    ], 3);

    y += 10;
    y = drawTable(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
      columns: [
        { header: 'Event', width: 170 },
        { header: 'Client', width: 120 },
        { header: 'Source', width: 90 },
        { header: 'Value', width: 80, align: 'right' },
        { header: 'Status', width: 52, align: 'center' },
      ],
      rows: metrics.pipelineForecast.deals.map(d => [
        truncateText(d.eventName, 26),
        truncateText(d.clientName, 18),
        truncateText(d.leadSource, 14),
        formatCurrencyFull(d.revenue),
        d.status === 'proposal_sent' ? 'Prop.' : 'Pend.',
      ]),
    });
  }

  if (sources.length > 0) {
    y = ensureSpace(doc, y, 180);
    y = drawSectionTitle(doc, 'Lead Source Detail', y);
    y = drawTable(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
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
          formatCurrencyFull(data.revenue),
          formatPercent(data.conversionRate),
          data.count > 0 ? formatCurrencyFull(Math.round(data.revenue / data.count)) : '$0',
        ]),
    });
  }

  drawPageFooter(doc);
  return collectBuffer(doc);
}
