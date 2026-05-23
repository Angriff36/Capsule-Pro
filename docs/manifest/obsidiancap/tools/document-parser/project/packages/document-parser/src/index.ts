import { extract } from './extraction/docling-adapter.js';
import { segment } from './segmentation/segmenter.js';
import { classify } from './ai/classifier.js';
import { normalizeMenuEntities } from './normalizers/menu-normalizer.js';
import { normalizeInventoryEntities } from './normalizers/inventory-normalizer.js';
import { normalizeStaffingEntities } from './normalizers/staffing-normalizer.js';
import { buildParseResult } from './diagnostics/report.js';
import type {
  ParseResult,
  PipelineConfig,
  DomainEntity,
  UnresolvedEntity,
  DiagnosticEntry,
} from './types/domain-types.js';
import { DEFAULT_CONFIG } from './types/domain-types.js';

export type {
  ParseResult,
  PipelineConfig,
  DomainEntity,
  MenuItem,
  Recipe,
  PrepTask,
  InventoryNeed,
  StaffingAssignment,
  UnresolvedEntity,
  DiagnosticEntry,
  LayoutBlock,
  CandidateBlock,
  ClassificationResult,
  ExtractionResult,
} from './types/domain-types.js';

export { DEFAULT_CONFIG } from './types/domain-types.js';
export { formatDiagnosticsReport } from './diagnostics/report.js';
export { validateEntity } from './validation/schemas.js';
export { segment } from './segmentation/segmenter.js';
export { classifyWithRules } from './ai/classifier.js';

export async function parseDocument(
  filePath: string,
  format: 'pdf' | 'csv' | 'tpp',
  userConfig: Partial<PipelineConfig> = {}
): Promise<ParseResult> {
  const config: PipelineConfig = { ...DEFAULT_CONFIG, ...userConfig };
  const allDiagnostics: DiagnosticEntry[] = [];
  const allEntities: DomainEntity[] = [];
  const allUnresolved: UnresolvedEntity[] = [];

  const extraction = await extract(filePath, format, config);
  allDiagnostics.push(
    ...extraction.issues.map((issue) => ({
      stage: 'extraction' as const,
      severity: issue.severity === 'error' ? 'error' as const : 'warning' as const,
      message: issue.message,
      details: { page: issue.page, blockId: issue.blockId },
    }))
  );

  if (extraction.blocks.length === 0) {
    allDiagnostics.push({
      stage: 'extraction',
      severity: 'error',
      message: 'No blocks extracted from document',
    });
    return buildParseResult([], [], allDiagnostics, {
      totalBlocksExtracted: 0,
      blocksSuppressed: 0,
      blocksClassified: 0,
      confidenceScores: [],
    });
  }

  const segmentation = segment(extraction.blocks, config);
  allDiagnostics.push(...segmentation.diagnostics);

  const activeCandidates = segmentation.candidates.filter((c) => !c.suppressed);
  const suppressedCount = segmentation.candidates.filter((c) => c.suppressed).length;

  const classification = await classify(activeCandidates, config);
  allDiagnostics.push(...classification.diagnostics);

  const confidenceScores = classification.results.map((r) => r.confidence);

  const menuResult = normalizeMenuEntities(
    segmentation.candidates,
    classification.results,
    config
  );
  allEntities.push(...menuResult.menuItems, ...menuResult.recipes, ...menuResult.prepTasks);
  allUnresolved.push(...menuResult.unresolved);
  allDiagnostics.push(...menuResult.diagnostics);

  const inventoryResult = normalizeInventoryEntities(
    segmentation.candidates,
    classification.results,
    config
  );
  allEntities.push(...inventoryResult.inventoryNeeds);
  allUnresolved.push(...inventoryResult.unresolved);
  allDiagnostics.push(...inventoryResult.diagnostics);

  const staffingResult = normalizeStaffingEntities(
    segmentation.candidates,
    classification.results,
    config
  );
  allEntities.push(...staffingResult.assignments);
  allUnresolved.push(...staffingResult.unresolved);
  allDiagnostics.push(...staffingResult.diagnostics);

  return buildParseResult(allEntities, allUnresolved, allDiagnostics, {
    totalBlocksExtracted: extraction.blocks.length,
    blocksSuppressed: suppressedCount,
    blocksClassified: classification.results.length,
    confidenceScores,
  });
}
