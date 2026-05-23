import PDFDocument from 'pdfkit';
import { TableOptions, COLORS } from '../types';
import { PAGE } from './document';

export interface MetricCardData {
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function drawMetricCards(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  cards: MetricCardData[],
  columns?: number
): number {
  const cols = columns ?? Math.min(cards.length, 4);
  const gap = 12;
  const cardWidth = (PAGE.contentWidth - gap * (cols - 1)) / cols;
  const cardHeight = 65;

  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cardX = PAGE.margin + col * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);

    doc.save();
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4)
      .fill(COLORS.metricBg);

    doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.navy)
      .text(card.value, cardX + 12, cardY + 12, { width: cardWidth - 24, lineBreak: false });

    doc.fontSize(8).font('Helvetica').fillColor(COLORS.lightText)
      .text(card.label, cardX + 12, cardY + 36, { width: cardWidth - 24, lineBreak: false });

    if (card.subtext) {
      const subtextColor = card.trend === 'up' ? COLORS.green
        : card.trend === 'down' ? COLORS.red
        : COLORS.mediumText;
      doc.fontSize(7).font('Helvetica').fillColor(subtextColor)
        .text(card.subtext, cardX + 12, cardY + 48, { width: cardWidth - 24, lineBreak: false });
    }

    doc.restore();
  });

  const rowCount = Math.ceil(cards.length / cols);
  const returnY = y + rowCount * (cardHeight + gap);
  doc.x = PAGE.margin;
  doc.y = returnY;
  return returnY;
}

export function drawSectionTitle(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  y: number
): number {
  doc.moveTo(PAGE.margin, y)
    .lineTo(PAGE.margin + PAGE.contentWidth, y)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.navy)
    .text(title, PAGE.margin, y + 8, { width: PAGE.contentWidth, lineBreak: false });

  const returnY = y + 28;
  doc.x = PAGE.margin;
  doc.y = returnY;
  return returnY;
}

export function drawTable(
  doc: InstanceType<typeof PDFDocument>,
  options: TableOptions
): number {
  const { x, y, width, columns, rows, headerColor = COLORS.navy } = options;
  const rowHeight = 22;
  const headerHeight = 26;
  const padding = 8;

  doc.rect(x, y, width, headerHeight).fill(headerColor);

  let colX = x;
  columns.forEach((col) => {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.white)
      .text(col.header, colX + padding, y + 8, {
        width: col.width - padding * 2,
        align: col.align || 'left',
        lineBreak: false,
      });
    colX += col.width;
  });

  let currentY = y + headerHeight;

  rows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 0) {
      doc.rect(x, currentY, width, rowHeight).fill(COLORS.lightBg);
    }

    colX = x;
    row.forEach((cell, cellIndex) => {
      const col = columns[cellIndex];
      if (!col) return;
      doc.fontSize(8).font('Helvetica').fillColor(COLORS.darkText)
        .text(cell, colX + padding, currentY + 6, {
          width: col.width - padding * 2,
          align: col.align || 'left',
          lineBreak: false,
        });
      colX += col.width;
    });

    currentY += rowHeight;
  });

  doc.rect(x, y, width, headerHeight + rows.length * rowHeight)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  const returnY = currentY + 10;
  doc.x = x;
  doc.y = returnY;
  return returnY;
}

export function drawTextBlock(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  items: string[],
  bulletColor: string = COLORS.navy
): number {
  let currentY = y;

  items.forEach((item) => {
    doc.circle(PAGE.margin + 4, currentY + 5, 2.5).fill(bulletColor);
    const textHeight = doc.heightOfString(item, { width: PAGE.contentWidth - 14 });
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.darkText)
      .text(item, PAGE.margin + 14, currentY, {
        width: PAGE.contentWidth - 14,
        lineGap: 2,
        lineBreak: true,
      });
    currentY += textHeight + 8;
  });

  doc.x = PAGE.margin;
  doc.y = currentY;
  return currentY;
}

export function ensureSpace(
  doc: InstanceType<typeof PDFDocument>,
  currentY: number,
  needed: number
): number {
  if (currentY + needed > PAGE.contentBottom - 40) {
    doc.addPage();
    return PAGE.margin;
  }
  return currentY;
}
