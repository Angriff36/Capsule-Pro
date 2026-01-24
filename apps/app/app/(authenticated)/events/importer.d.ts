import "server-only";
export declare const importEventFromCsvText: ({
  tenantId,
  fileName,
  content,
}: {
  tenantId: string;
  fileName: string;
  content: string;
}) => Promise<`${string}-${string}-${string}-${string}-${string}`>;
export declare const importEventFromPdf: ({
  tenantId,
  fileName,
  content,
}: {
  tenantId: string;
  fileName: string;
  content: Buffer;
}) => Promise<`${string}-${string}-${string}-${string}-${string}`>;
//# sourceMappingURL=importer.d.ts.map
