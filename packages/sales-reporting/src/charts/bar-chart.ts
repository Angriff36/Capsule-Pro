import PDFDocument from 'pdfkit';
import { BarChartOptions, CHART_PALETTE, COLORS } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatting';
import { niceScale, formatAxisLabel } from './chart-utils';

export function drawBarChart(doc: InstanceType<typeof PDFDocument>, options: BarChartOptions): number {
  const {
    x, y, width, height,
    data, title,
    colors = CHART_PALETTE,
    showCurrency = true,
  } = options;

  if (data.length === 0) return y;

  doc.save();

  if (title) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.darkText)
      .text(title, x, y, { width, lineBreak: false });
  }

  const chartTop = y + (title ? 22 : 0);
  const labelAreaWidth = 60;
  const chartLeft = x + labelAreaWidth;
  const chartWidth = width - labelAreaWidth - 10;
  const chartBottom = y + height - 25;
  const chartHeight = chartBottom - chartTop;

  const maxValue = Math.max(...data.map(d => d.value));
  const scale = niceScale(maxValue, 4);

  for (const tick of scale.ticks) {
    const tickY = chartBottom - (tick / scale.max) * chartHeight;
    doc.moveTo(chartLeft, tickY)
      .lineTo(chartLeft + chartWidth, tickY)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    doc.fontSize(7).font('Helvetica').fillColor(COLORS.lightText)
      .text(
        formatAxisLabel(tick, showCurrency),
        x, tickY - 4,
        { width: labelAreaWidth - 8, align: 'right', lineBreak: false }
      );
  }

  const barCount = data.length;
  const groupWidth = chartWidth / barCount;
  const barWidth = Math.min(groupWidth * 0.6, 50);
  const barOffset = (groupWidth - barWidth) / 2;

  data.forEach((item, i) => {
    const barX = chartLeft + i * groupWidth + barOffset;
    const barHeight = scale.max > 0 ? (item.value / scale.max) * chartHeight : 0;
    const barY = chartBottom - barHeight;

    doc.rect(barX, barY, barWidth, barHeight)
      .fill(colors[i % colors.length]);

    const labelText = showCurrency ? formatCurrency(item.value) : formatNumber(item.value);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.darkText)
      .text(labelText, barX - 5, barY - 12, { width: barWidth + 10, align: 'center', lineBreak: false });

    doc.fontSize(7).font('Helvetica').fillColor(COLORS.mediumText)
      .text(item.label, barX - 10, chartBottom + 4, { width: barWidth + 20, align: 'center', lineBreak: false });
  });

  doc.moveTo(chartLeft, chartBottom)
    .lineTo(chartLeft + chartWidth, chartBottom)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();

  doc.restore();

  const returnY = y + height;
  doc.x = x;
  doc.y = returnY;
  return returnY;
}
