import PDFDocument from 'pdfkit';
import { TableOptions } from '../types';
export interface MetricCardData {
    label: string;
    value: string;
    subtext?: string;
    trend?: 'up' | 'down' | 'neutral';
}
export declare function drawMetricCards(doc: InstanceType<typeof PDFDocument>, y: number, cards: MetricCardData[], columns?: number): number;
export declare function drawSectionTitle(doc: InstanceType<typeof PDFDocument>, title: string, y: number): number;
export declare function drawTable(doc: InstanceType<typeof PDFDocument>, options: TableOptions): number;
export declare function drawTextBlock(doc: InstanceType<typeof PDFDocument>, y: number, items: string[], bulletColor?: string): number;
export declare function ensureSpace(doc: InstanceType<typeof PDFDocument>, currentY: number, needed: number): number;
//# sourceMappingURL=components.d.ts.map