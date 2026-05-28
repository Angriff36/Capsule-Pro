import type { ParsedDocumentResult } from '../types';
import { extractPdfText } from './pdf-extractor';
import { detectTppFormat, parseTppDocument } from './tpp-parser';
import { parseCsvDocument } from './csv-parser';
import { parseGenericPdf } from './generic-parser';

export async function processDocument(file: File): Promise<ParsedDocumentResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  try {
    switch (ext) {
      case 'pdf': {
        const lines = await extractPdfText(file);
        if (lines.length === 0) {
          return fail('generic', 'PDF appears empty or image-only');
        }
        if (detectTppFormat(lines)) {
          return parseTppDocument(lines, file.name);
        }
        return parseGenericPdf(lines);
      }
      case 'csv':
        return parseCsvDocument(await file.text());
      default:
        return fail('generic', `Unsupported format: .${ext}. Supported: PDF, CSV`);
    }
  } catch (err) {
    return fail('generic', err instanceof Error ? err.message : 'Unknown processing error');
  }
}

function fail(format: ParsedDocumentResult['format'], error: string): ParsedDocumentResult {
  return {
    success: false,
    format,
    confidence: 'low',
    data: { meta: {}, staff: [], timeline: [], layouts: [] },
    warnings: [],
    error,
  };
}
