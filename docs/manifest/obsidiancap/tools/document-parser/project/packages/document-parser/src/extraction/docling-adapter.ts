import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  ExtractionResult,
  ExtractionIssue,
  LayoutBlock,
  PipelineConfig,
} from '../types/domain-types.js';

interface DoclingOutput {
  pages: DoclingPage[];
  metadata?: {
    page_count?: number;
    ocr_applied?: boolean;
  };
}

interface DoclingPage {
  page_number: number;
  blocks: DoclingBlock[];
}

interface DoclingBlock {
  id: string;
  type: string;
  text: string;
  bbox?: { x: number; y: number; w: number; h: number };
  font_size?: number;
  font_weight?: string;
  alignment?: string;
  line_spacing_before?: number;
  table_data?: string[][];
  children?: DoclingBlock[];
}

function mapBlockType(raw: string): LayoutBlock['type'] {
  const mapping: Record<string, LayoutBlock['type']> = {
    text: 'text',
    paragraph: 'text',
    table: 'table',
    heading: 'heading',
    title: 'heading',
    list: 'list',
    list_item: 'list',
    image: 'image',
    figure: 'image',
  };
  return mapping[raw.toLowerCase()] ?? 'unknown';
}

function mapFontWeight(raw?: string): 'normal' | 'bold' | undefined {
  if (!raw) return undefined;
  return raw.toLowerCase() === 'bold' ? 'bold' : 'normal';
}

function mapAlignment(raw?: string): LayoutBlock['alignment'] {
  if (!raw) return undefined;
  const val = raw.toLowerCase();
  if (val === 'center' || val === 'centered') return 'center';
  if (val === 'right') return 'right';
  return 'left';
}

function convertDoclingBlock(block: DoclingBlock, page: number): LayoutBlock {
  return {
    id: block.id,
    type: mapBlockType(block.type),
    content: block.text,
    page,
    boundingBox: block.bbox
      ? { x: block.bbox.x, y: block.bbox.y, width: block.bbox.w, height: block.bbox.h }
      : undefined,
    fontSize: block.font_size,
    fontWeight: mapFontWeight(block.font_weight),
    lineSpacingBefore: block.line_spacing_before,
    alignment: mapAlignment(block.alignment),
    tableData: block.table_data,
    children: block.children?.map((c) => convertDoclingBlock(c, page)),
  };
}

export async function extractPdf(
  filePath: string,
  config: PipelineConfig
): Promise<ExtractionResult> {
  const issues: ExtractionIssue[] = [];

  if (!existsSync(filePath)) {
    issues.push({ severity: 'warning', message: `File not found: ${filePath}. Using mock extraction.` });
    return extractPdfMock(filePath, issues);
  }

  const command = config.doclingCommand ?? 'docling';
  const outputPath = join(tmpdir(), `docling-output-${Date.now()}.json`);

  try {
    const args = [
      command,
      '--input', filePath,
      '--output', outputPath,
      '--format', 'json',
    ];
    if (config.ocrEnabled) {
      args.push('--ocr');
    }

    execSync(args.join(' '), { timeout: 60_000, stdio: 'pipe' });

    const raw = readFileSync(outputPath, 'utf-8');
    const doclingOutput: DoclingOutput = JSON.parse(raw);

    const blocks: LayoutBlock[] = [];
    for (const page of doclingOutput.pages) {
      for (const block of page.blocks) {
        blocks.push(convertDoclingBlock(block, page.page_number));
      }
    }

    return {
      source: filePath,
      format: 'pdf',
      blocks,
      metadata: {
        pageCount: doclingOutput.metadata?.page_count ?? doclingOutput.pages.length,
        ocrApplied: doclingOutput.metadata?.ocr_applied ?? false,
        extractionEngine: 'docling',
      },
      issues,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push({
      severity: 'error',
      message: `Docling extraction failed: ${message}. Falling back to mock extraction.`,
    });
    return extractPdfMock(filePath, issues);
  }
}

export function extractPdfMock(
  filePath: string,
  existingIssues: ExtractionIssue[] = []
): ExtractionResult {
  const issues: ExtractionIssue[] = [
    ...existingIssues,
    {
      severity: 'warning',
      message: 'Using mock extraction. Real Docling integration requires Python environment.',
    },
  ];

  const blocks: LayoutBlock[] = [
    {
      id: 'mock-heading-1',
      type: 'heading',
      content: 'Saturday Gala Menu',
      page: 1,
      fontSize: 24,
      fontWeight: 'bold',
      alignment: 'center',
      lineSpacingBefore: 0,
    },
    {
      id: 'mock-item-1',
      type: 'heading',
      content: 'Pan-Seared Salmon',
      page: 1,
      fontSize: 16,
      fontWeight: 'bold',
      alignment: 'left',
      lineSpacingBefore: 20,
    },
    {
      id: 'mock-desc-1',
      type: 'text',
      content: 'Wild-caught Atlantic salmon with lemon dill sauce, roasted asparagus, and fingerling potatoes',
      page: 1,
      fontSize: 11,
      fontWeight: 'normal',
      alignment: 'left',
      lineSpacingBefore: 4,
    },
    {
      id: 'mock-modifier-1',
      type: 'text',
      content: 'GF / DF option available',
      page: 1,
      fontSize: 9,
      fontWeight: 'normal',
      alignment: 'left',
      lineSpacingBefore: 2,
    },
    {
      id: 'mock-orphan-1',
      type: 'text',
      content: '2',
      page: 1,
      fontSize: 9,
      fontWeight: 'normal',
      alignment: 'right',
      lineSpacingBefore: 0,
    },
    {
      id: 'mock-item-2',
      type: 'heading',
      content: 'Braised Short Ribs',
      page: 1,
      fontSize: 16,
      fontWeight: 'bold',
      alignment: 'left',
      lineSpacingBefore: 24,
    },
    {
      id: 'mock-desc-2',
      type: 'text',
      content: 'Slow-braised beef short ribs, red wine reduction, creamy polenta, seasonal vegetables',
      page: 1,
      fontSize: 11,
      fontWeight: 'normal',
      alignment: 'left',
      lineSpacingBefore: 4,
    },
    {
      id: 'mock-page-num',
      type: 'text',
      content: 'Page 1 of 3',
      page: 1,
      fontSize: 8,
      fontWeight: 'normal',
      alignment: 'center',
      lineSpacingBefore: 40,
    },
    {
      id: 'mock-orphan-2',
      type: 'text',
      content: '3',
      page: 2,
      fontSize: 8,
      fontWeight: 'normal',
      alignment: 'right',
      lineSpacingBefore: 0,
    },
    {
      id: 'mock-note-1',
      type: 'text',
      content: 'Chef note: prep salmon marinade day-before. Station 2 handles all fish.',
      page: 2,
      fontSize: 10,
      fontWeight: 'normal',
      alignment: 'left',
      lineSpacingBefore: 12,
    },
    {
      id: 'mock-staffing-1',
      type: 'text',
      content: 'Station 1: Grill — Mike R. (PM shift)',
      page: 2,
      fontSize: 11,
      fontWeight: 'normal',
      alignment: 'left',
      lineSpacingBefore: 16,
    },
    {
      id: 'mock-staffing-2',
      type: 'text',
      content: 'Station 2: Sauté — Lisa K. (PM shift)',
      page: 2,
      fontSize: 11,
      fontWeight: 'normal',
      alignment: 'left',
      lineSpacingBefore: 4,
    },
    {
      id: 'mock-inventory-1',
      type: 'text',
      content: 'Need: 20 lbs Atlantic salmon fillets, 15 lbs short ribs, 10 lbs fingerling potatoes',
      page: 2,
      fontSize: 10,
      fontWeight: 'normal',
      alignment: 'left',
      lineSpacingBefore: 16,
    },
  ];

  return {
    source: filePath,
    format: 'pdf',
    blocks,
    metadata: {
      pageCount: 2,
      ocrApplied: false,
      extractionEngine: 'docling-mock',
    },
    issues,
  };
}

export function extractCsv(filePath: string): ExtractionResult {
  const issues: ExtractionIssue[] = [];

  if (!existsSync(filePath)) {
    return {
      source: filePath,
      format: 'csv',
      blocks: [],
      metadata: { ocrApplied: false, extractionEngine: 'csv-parser' },
      issues: [{ severity: 'error', message: `File not found: ${filePath}` }],
    };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      issues.push({ severity: 'warning', message: 'CSV file is empty' });
      return {
        source: filePath,
        format: 'csv',
        blocks: [],
        metadata: { ocrApplied: false, extractionEngine: 'csv-parser' },
        issues,
      };
    }

    const rows = lines.map((line) => parseCsvLine(line));
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const blocks: LayoutBlock[] = [
      {
        id: 'csv-table-0',
        type: 'table',
        content: headers.join(' | '),
        page: 1,
        tableData: [headers, ...dataRows],
      },
    ];

    return {
      source: filePath,
      format: 'csv',
      blocks,
      metadata: { ocrApplied: false, extractionEngine: 'csv-parser' },
      issues,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push({ severity: 'error', message: `CSV parsing failed: ${message}` });
    return {
      source: filePath,
      format: 'csv',
      blocks: [],
      metadata: { ocrApplied: false, extractionEngine: 'csv-parser' },
      issues,
    };
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function extract(
  filePath: string,
  format: 'pdf' | 'csv' | 'tpp',
  config: PipelineConfig
): Promise<ExtractionResult> {
  switch (format) {
    case 'pdf':
      return extractPdf(filePath, config);
    case 'csv':
      return extractCsv(filePath);
    case 'tpp':
      return extractCsv(filePath);
  }
}
