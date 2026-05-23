import PDFDocument from 'pdfkit';
import { QuarterlyMetrics, ReportConfig, COLORS } from '../types';
import { createDocument, collectBuffer, drawHeader, drawPageFooter, addPageBreak, PAGE } from './document';
import {
  drawMetricCards, drawSectionTitle, drawTable,
  drawTextBlock, ensureSpace,
} from './components';
import { drawBarChart, drawLineChart } from '../charts';
import { formatCurrencyFull, formatPercent, formatNumber } from '../utils/formatting';
import { getQuarterLabel, formatDateShort } from '../utils/date';

export async function generateQuarterlyPdf(
  metrics: QuarterlyMetrics,
  config: ReportConfig
): Promise<Buffer> {
  const doc = createDocument();
  const companyName = config.companyName || 'Sales Report';
  const dateRange = `${getQuarterLabel(metrics.dateRange.start)}  |  ${formatDateShort(metrics.dateRange.start)} — ${formatDateShort(metrics.dateRange.end)}`;

  let y = drawHeader(doc, companyName, 'Quarterly Sales Report', dateRange);

  const totalDeals = Object.values(metrics.customerSegments)
    .reduce((sum, s) => sum + s.count, 0);
  const avgDealValue = totalDeals > 0 ? metrics.totalRevenue / totalDeals : 0;

  y = drawMetricCards(doc, y, [
    {
      label: 'Total Revenue',
      value: formatCurrencyFull(metrics.totalRevenue),
    },
    {
      label: 'Total Deals',
      value: formatNumber(totalDeals),
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
      value: formatCurrencyFull(avgDealValue),
    },
  ]);

  y += 8;

  const segments = Object.entries(metrics.customerSegments);
  if (segments.length > 0) {
    y = drawSectionTitle(doc, 'Customer Segment Analysis', y);
    y = drawBarChart(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
      height: 200,
      data: segments
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([label, data]) => ({ label, value: data.revenue })),
      title: '',
      showCurrency: true,
    });

    y = ensureSpace(doc, y, 120);
    y = drawTable(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
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
          formatCurrencyFull(data.revenue),
          formatCurrencyFull(data.avgValue),
          metrics.salesCycleLength.bySegment[segment]
            ? String(metrics.salesCycleLength.bySegment[segment])
            : 'N/A',
        ]),
    });
  }

  y = addPageBreak(doc);

  if (metrics.pricingTrends.length > 0) {
    y = drawSectionTitle(doc, 'Pricing Trends', y);
    y = drawLineChart(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
      height: 210,
      series: [{
        label: 'Avg Deal Value',
        data: metrics.pricingTrends.map(t => ({ label: t.month, value: t.avgValue })),
        color: COLORS.navy,
      }],
      title: '',
      showCurrency: true,
    });
  }

  y += 5;
  const referrals = Object.entries(metrics.referralPerformance);
  if (referrals.length > 0) {
    y = ensureSpace(doc, y, 160);
    y = drawSectionTitle(doc, 'Referral & Lead Source Performance', y);
    y = drawTable(doc, {
      x: PAGE.margin,
      y,
      width: PAGE.contentWidth,
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
          formatCurrencyFull(data.revenue),
          formatPercent(data.conversionRate),
          data.count > 0 ? formatCurrencyFull(Math.round(data.revenue / data.count)) : '$0',
        ]),
    });
  }

  y = addPageBreak(doc);

  if (metrics.recommendations.length > 0) {
    y = drawSectionTitle(doc, 'Recommendations', y);
    y = drawTextBlock(doc, y, metrics.recommendations, COLORS.navy);
  }

  y += 15;
  y = drawSectionTitle(doc, 'Next Quarter Goals', y);
  y = drawMetricCards(doc, y, [
    {
      label: 'Revenue Target',
      value: formatCurrencyFull(metrics.nextQuarterGoals.revenueTarget),
      subtext: '+10% growth target',
      trend: 'up',
    },
    {
      label: 'Lead Target',
      value: formatNumber(metrics.nextQuarterGoals.leadTarget),
      subtext: 'To hit revenue goal',
    },
    {
      label: 'Conversion Target',
      value: formatPercent(metrics.nextQuarterGoals.conversionTarget),
      subtext: '+5pp improvement',
      trend: 'up',
    },
  ], 3);

  drawPageFooter(doc);
  return collectBuffer(doc);
}
