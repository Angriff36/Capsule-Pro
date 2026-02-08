import PDFDocument from 'pdfkit';
export declare const PAGE: {
    readonly width: 612;
    readonly height: 792;
    readonly margin: 50;
    readonly contentWidth: 512;
    readonly contentBottom: 742;
};
export declare function createDocument(): InstanceType<typeof PDFDocument>;
export declare function collectBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer>;
export declare function drawHeader(doc: InstanceType<typeof PDFDocument>, companyName: string, reportTitle: string, dateRangeText: string): number;
export declare function drawPageFooter(doc: InstanceType<typeof PDFDocument>): void;
export declare function addPageBreak(doc: InstanceType<typeof PDFDocument>): number;
//# sourceMappingURL=document.d.ts.map