import type {
  LayoutBlock,
  CandidateBlock,
  PipelineConfig,
  DiagnosticEntry,
} from '../types/domain-types.js';

const ORPHAN_NUMBER_PATTERN = /^\d{1,3}$/;
const PAGE_NUMBER_PATTERN = /^page\s+\d+(\s+(of|\/)\s+\d+)?$/i;
const SECTION_COUNTER_PATTERN = /^(section|part|chapter)\s+\d+$/i;
const ARTIFACT_PATTERNS = [
  /^[-–—]+$/,
  /^\*{2,}$/,
  /^\.{3,}$/,
  /^_{3,}$/,
];

const FOOD_ADJACENT_PATTERN = /\b(oz|lb|lbs|kg|g|ml|cup|cups|tbsp|tsp|pcs|pieces|servings?|portions?|x\s+\d)\b/i;

interface SegmentationOutput {
  candidates: CandidateBlock[];
  diagnostics: DiagnosticEntry[];
}

export function segment(
  blocks: LayoutBlock[],
  config: PipelineConfig
): SegmentationOutput {
  const diagnostics: DiagnosticEntry[] = [];
  const candidates: CandidateBlock[] = [];

  const filtered = blocks.filter((block) => {
    const suppression = checkSuppression(block, blocks, config);
    if (suppression) {
      diagnostics.push({
        stage: 'segmentation',
        severity: 'info',
        message: `Suppressed block "${truncate(block.content, 40)}": ${suppression}`,
        details: { blockId: block.id, reason: suppression },
      });
      candidates.push({
        id: block.id,
        blocks: [block],
        mergedContent: block.content,
        segmentationType: 'ambiguous',
        suppressionReason: suppression,
        suppressed: true,
      });
      return false;
    }
    return true;
  });

  const groups = groupIntoEntities(filtered);

  for (const group of groups) {
    const merged = group.map((b) => b.content).join('\n');
    const segType = classifySegmentType(group);

    candidates.push({
      id: group[0].id,
      blocks: group,
      mergedContent: merged,
      segmentationType: segType,
      suppressed: false,
    });
  }

  diagnostics.push({
    stage: 'segmentation',
    severity: 'info',
    message: `Segmentation complete: ${candidates.filter((c) => !c.suppressed).length} candidates, ${candidates.filter((c) => c.suppressed).length} suppressed`,
  });

  return { candidates, diagnostics };
}

function checkSuppression(
  block: LayoutBlock,
  allBlocks: LayoutBlock[],
  config: PipelineConfig
): string | null {
  const content = block.content.trim();

  if (content.length === 0) {
    return 'empty content';
  }

  if (config.suppressOrphanNumbers && ORPHAN_NUMBER_PATTERN.test(content)) {
    if (!isNumberInFoodContext(block, allBlocks)) {
      return 'orphan number — not in food-quantity context';
    }
  }

  if (config.suppressPageNumbers && PAGE_NUMBER_PATTERN.test(content)) {
    return 'page number artifact';
  }

  if (config.minContentLength && content.length < config.minContentLength) {
    if (!FOOD_ADJACENT_PATTERN.test(content)) {
      return `content below minimum length (${config.minContentLength} chars)`;
    }
  }

  if (SECTION_COUNTER_PATTERN.test(content)) {
    return 'section counter artifact';
  }

  for (const pattern of ARTIFACT_PATTERNS) {
    if (pattern.test(content)) {
      return 'visual artifact (decorative line/separator)';
    }
  }

  return null;
}

function isNumberInFoodContext(block: LayoutBlock, allBlocks: LayoutBlock[]): boolean {
  const idx = allBlocks.indexOf(block);
  if (idx === -1) return false;

  const next = allBlocks[idx + 1];
  if (next && FOOD_ADJACENT_PATTERN.test(next.content)) {
    return true;
  }

  const prev = allBlocks[idx - 1];
  if (prev && FOOD_ADJACENT_PATTERN.test(prev.content)) {
    return true;
  }

  return false;
}

function groupIntoEntities(blocks: LayoutBlock[]): LayoutBlock[][] {
  const groups: LayoutBlock[][] = [];
  let currentGroup: LayoutBlock[] = [];
  let currentPage = blocks[0]?.page ?? 1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isHeader = isMenuItemHeader(block);
    const hasLargeGap = hasSignificantSpacingGap(block);
    const pageChanged = block.page !== currentPage;
    const hasModeratGap = (block.lineSpacingBefore ?? 0) >= 14;

    const shouldSplit =
      isHeader ||
      pageChanged ||
      (hasLargeGap && currentGroup.length > 0) ||
      (hasModeratGap && currentGroup.length > 0 && looksLikeNewSection(block));

    if (shouldSplit) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [block];
      currentPage = block.page;
    } else {
      if (currentGroup.length === 0) {
        currentGroup = [block];
      } else {
        currentGroup.push(block);
      }
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function looksLikeNewSection(block: LayoutBlock): boolean {
  const content = block.content.toLowerCase();
  return /\b(station|need|note|chef|prep|inventory|staff)\b/i.test(content) ||
    /^[A-Z]/.test(block.content);
}

function isMenuItemHeader(block: LayoutBlock): boolean {
  if (block.type === 'heading') return true;
  if (block.fontWeight === 'bold' && block.fontSize && block.fontSize >= 14) return true;
  if (block.lineSpacingBefore && block.lineSpacingBefore >= 16 && block.fontWeight === 'bold') {
    return true;
  }
  return false;
}

function hasSignificantSpacingGap(block: LayoutBlock): boolean {
  return (block.lineSpacingBefore ?? 0) >= 20;
}

function classifySegmentType(blocks: LayoutBlock[]): CandidateBlock['segmentationType'] {
  const first = blocks[0];

  if (first.type === 'table' || first.tableData) {
    return 'table_row';
  }

  if (first.type === 'list') {
    return 'list_entry';
  }

  if (isMenuItemHeader(first)) {
    return 'menu_item_header';
  }

  if (first.type === 'text') {
    return 'body_text';
  }

  return 'ambiguous';
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
