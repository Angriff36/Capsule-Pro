export interface LayoutBlock {
  id: string;
  type: 'text' | 'table' | 'heading' | 'list' | 'image' | 'unknown';
  content: string;
  page: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  lineSpacingBefore?: number;
  alignment?: 'left' | 'center' | 'right';
}

export interface CandidateBlock {
  id: string;
  mergedContent: string;
  segmentationType: string;
  suppressed: boolean;
  suppressionReason?: string;
}

export interface ClassificationResult {
  blockId: string;
  classification: string;
  confidence: number;
  rationale: string;
  belongsToPreviousItem: boolean;
}

export type EntityKind = 'menu_item' | 'recipe' | 'prep_task' | 'inventory_need' | 'staffing_assignment';

export interface DomainEntity {
  kind: EntityKind;
  name?: string;
  description?: string;
  task?: string;
  item?: string;
  role?: string;
  person?: string;
  station?: string;
  shift?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  dietaryFlags?: string[];
  modifiers?: string[];
  sourceBlockIds: string[];
}

export interface UnresolvedEntity {
  candidateBlockId: string;
  rawContent: string;
  attemptedType?: string;
  reason: string;
}

export interface DiagnosticEntry {
  stage: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface ParseSummary {
  totalBlocksExtracted: number;
  blocksSuppressed: number;
  blocksClassified: number;
  entitiesProduced: number;
  unresolvedCount: number;
  averageConfidence: number;
}

export const MOCK_BLOCKS: LayoutBlock[] = [
  { id: 'mock-heading-1', type: 'heading', content: 'Saturday Gala Menu', page: 1, fontSize: 24, fontWeight: 'bold', alignment: 'center', lineSpacingBefore: 0 },
  { id: 'mock-item-1', type: 'heading', content: 'Pan-Seared Salmon', page: 1, fontSize: 16, fontWeight: 'bold', alignment: 'left', lineSpacingBefore: 20 },
  { id: 'mock-desc-1', type: 'text', content: 'Wild-caught Atlantic salmon with lemon dill sauce, roasted asparagus, and fingerling potatoes', page: 1, fontSize: 11, fontWeight: 'normal', alignment: 'left', lineSpacingBefore: 4 },
  { id: 'mock-modifier-1', type: 'text', content: 'GF / DF option available', page: 1, fontSize: 9, fontWeight: 'normal', alignment: 'left', lineSpacingBefore: 2 },
  { id: 'mock-orphan-1', type: 'text', content: '2', page: 1, fontSize: 9, fontWeight: 'normal', alignment: 'right', lineSpacingBefore: 0 },
  { id: 'mock-item-2', type: 'heading', content: 'Braised Short Ribs', page: 1, fontSize: 16, fontWeight: 'bold', alignment: 'left', lineSpacingBefore: 24 },
  { id: 'mock-desc-2', type: 'text', content: 'Slow-braised beef short ribs, red wine reduction, creamy polenta, seasonal vegetables', page: 1, fontSize: 11, fontWeight: 'normal', alignment: 'left', lineSpacingBefore: 4 },
  { id: 'mock-page-num', type: 'text', content: 'Page 1 of 3', page: 1, fontSize: 8, fontWeight: 'normal', alignment: 'center', lineSpacingBefore: 40 },
  { id: 'mock-orphan-2', type: 'text', content: '3', page: 2, fontSize: 8, fontWeight: 'normal', alignment: 'right', lineSpacingBefore: 0 },
  { id: 'mock-note-1', type: 'text', content: 'Chef note: prep salmon marinade day-before. Station 2 handles all fish.', page: 2, fontSize: 10, fontWeight: 'normal', alignment: 'left', lineSpacingBefore: 12 },
  { id: 'mock-staffing-1', type: 'text', content: 'Station 1: Grill — Mike R. (PM shift)', page: 2, fontSize: 11, fontWeight: 'normal', alignment: 'left', lineSpacingBefore: 16 },
  { id: 'mock-staffing-2', type: 'text', content: 'Station 2: Sauté — Lisa K. (PM shift)', page: 2, fontSize: 11, fontWeight: 'normal', alignment: 'left', lineSpacingBefore: 4 },
  { id: 'mock-inventory-1', type: 'text', content: 'Need: 20 lbs Atlantic salmon fillets, 15 lbs short ribs, 10 lbs fingerling potatoes', page: 2, fontSize: 10, fontWeight: 'normal', alignment: 'left', lineSpacingBefore: 16 },
];

export const MOCK_CANDIDATES: CandidateBlock[] = [
  { id: 'mock-heading-1', mergedContent: 'Saturday Gala Menu', segmentationType: 'menu_item_header', suppressed: false },
  { id: 'mock-item-1', mergedContent: 'Pan-Seared Salmon\nWild-caught Atlantic salmon with lemon dill sauce, roasted asparagus, and fingerling potatoes', segmentationType: 'menu_item_header', suppressed: false },
  { id: 'mock-modifier-1', mergedContent: 'GF / DF option available', segmentationType: 'body_text', suppressed: false },
  { id: 'mock-orphan-1', mergedContent: '2', segmentationType: 'ambiguous', suppressed: true, suppressionReason: 'orphan number — not in food-quantity context' },
  { id: 'mock-item-2', mergedContent: 'Braised Short Ribs\nSlow-braised beef short ribs, red wine reduction, creamy polenta, seasonal vegetables', segmentationType: 'menu_item_header', suppressed: false },
  { id: 'mock-page-num', mergedContent: 'Page 1 of 3', segmentationType: 'ambiguous', suppressed: true, suppressionReason: 'page number artifact' },
  { id: 'mock-orphan-2', mergedContent: '3', segmentationType: 'ambiguous', suppressed: true, suppressionReason: 'orphan number — not in food-quantity context' },
  { id: 'mock-note-1', mergedContent: 'Chef note: prep salmon marinade day-before. Station 2 handles all fish.', segmentationType: 'body_text', suppressed: false },
  { id: 'mock-staffing-1', mergedContent: 'Station 1: Grill — Mike R. (PM shift)\nStation 2: Sauté — Lisa K. (PM shift)', segmentationType: 'body_text', suppressed: false },
  { id: 'mock-inventory-1', mergedContent: 'Need: 20 lbs Atlantic salmon fillets, 15 lbs short ribs, 10 lbs fingerling potatoes', segmentationType: 'body_text', suppressed: false },
];

export const MOCK_CLASSIFICATIONS: ClassificationResult[] = [
  { blockId: 'mock-heading-1', classification: 'menu_item', confidence: 0.8, rationale: 'Heading-style block detected by segmenter', belongsToPreviousItem: false },
  { blockId: 'mock-item-1', classification: 'menu_item', confidence: 0.8, rationale: 'Heading-style block detected by segmenter', belongsToPreviousItem: false },
  { blockId: 'mock-modifier-1', classification: 'modifier', confidence: 0.75, rationale: 'Contains dietary flag keywords', belongsToPreviousItem: true },
  { blockId: 'mock-item-2', classification: 'menu_item', confidence: 0.8, rationale: 'Heading-style block detected by segmenter', belongsToPreviousItem: false },
  { blockId: 'mock-note-1', classification: 'instruction', confidence: 0.6, rationale: 'Contains preparation instruction keywords', belongsToPreviousItem: false },
  { blockId: 'mock-staffing-1', classification: 'note', confidence: 0.6, rationale: 'Contains staffing-related keywords and name patterns', belongsToPreviousItem: false },
  { blockId: 'mock-inventory-1', classification: 'ingredient_list', confidence: 0.65, rationale: 'Contains quantity + supply keywords', belongsToPreviousItem: false },
];

export const MOCK_ENTITIES: DomainEntity[] = [
  { kind: 'menu_item', name: 'Saturday Gala Menu', sourceBlockIds: ['mock-heading-1'] },
  { kind: 'menu_item', name: 'Pan-Seared Salmon', description: 'Wild-caught Atlantic salmon with lemon dill sauce, roasted asparagus, and fingerling potatoes', dietaryFlags: ['GF', 'DF'], sourceBlockIds: ['mock-item-1', 'mock-modifier-1'] },
  { kind: 'menu_item', name: 'Braised Short Ribs', description: 'Slow-braised beef short ribs, red wine reduction, creamy polenta, seasonal vegetables', sourceBlockIds: ['mock-item-2'] },
  { kind: 'prep_task', task: 'Prep salmon marinade day-before. Station 2 handles all fish.', sourceBlockIds: ['mock-note-1'] },
  { kind: 'staffing_assignment', role: 'Grill', person: 'Mike R.', station: 'Station 1', shift: 'PM shift', sourceBlockIds: ['mock-staffing-1'] },
  { kind: 'staffing_assignment', role: 'Sauté', person: 'Lisa K.', station: 'Station 2', shift: 'PM shift', sourceBlockIds: ['mock-staffing-1'] },
  { kind: 'inventory_need', item: 'Atlantic salmon fillets', quantity: 20, unit: 'lbs', sourceBlockIds: ['mock-inventory-1'] },
  { kind: 'inventory_need', item: 'short ribs', quantity: 15, unit: 'lbs', sourceBlockIds: ['mock-inventory-1'] },
  { kind: 'inventory_need', item: 'fingerling potatoes', quantity: 10, unit: 'lbs', sourceBlockIds: ['mock-inventory-1'] },
];

export const MOCK_UNRESOLVED: UnresolvedEntity[] = [
  { candidateBlockId: 'mock-note-1', rawContent: 'Chef note: prep salmon marinade day-before. Station 2 handles all fish.', attemptedType: 'staffing_assignment', reason: 'Confidence 0.60 below threshold' },
];

export const MOCK_DIAGNOSTICS: DiagnosticEntry[] = [
  { stage: 'extraction', severity: 'warning', message: 'Using mock extraction. Real Docling integration requires Python environment.' },
  { stage: 'segmentation', severity: 'info', message: 'Suppressed block "2": orphan number — not in food-quantity context' },
  { stage: 'segmentation', severity: 'info', message: 'Suppressed block "Page 1 of 3": page number artifact' },
  { stage: 'segmentation', severity: 'info', message: 'Suppressed block "3": orphan number — not in food-quantity context' },
  { stage: 'segmentation', severity: 'info', message: 'Segmentation complete: 7 candidates, 3 suppressed' },
  { stage: 'classification', severity: 'info', message: 'AI classification disabled. Using rule-based fallback.' },
  { stage: 'classification', severity: 'warning', message: 'Low confidence (0.60) for block "Chef note: prep salmon marinade day-before...": Contains preparation instruction keywords' },
  { stage: 'normalization', severity: 'info', message: 'Menu normalization: 3 menu items, 0 recipes, 1 prep tasks extracted' },
  { stage: 'normalization', severity: 'info', message: 'Inventory normalization: 3 items extracted' },
  { stage: 'normalization', severity: 'info', message: 'Staffing normalization: 2 assignments extracted' },
];

export const MOCK_SUMMARY: ParseSummary = {
  totalBlocksExtracted: 13,
  blocksSuppressed: 3,
  blocksClassified: 7,
  entitiesProduced: 9,
  unresolvedCount: 1,
  averageConfidence: 0.71,
};
