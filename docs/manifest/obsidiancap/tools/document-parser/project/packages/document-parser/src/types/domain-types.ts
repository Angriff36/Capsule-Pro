export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutBlock {
  id: string;
  type: 'text' | 'table' | 'heading' | 'list' | 'image' | 'unknown';
  content: string;
  page: number;
  boundingBox?: BoundingBox;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  lineSpacingBefore?: number;
  alignment?: 'left' | 'center' | 'right';
  children?: LayoutBlock[];
  tableData?: string[][];
}

export interface ExtractionResult {
  source: string;
  format: 'pdf' | 'csv' | 'tpp';
  blocks: LayoutBlock[];
  metadata: {
    pageCount?: number;
    ocrApplied: boolean;
    extractionEngine: string;
  };
  issues: ExtractionIssue[];
}

export interface ExtractionIssue {
  severity: 'warning' | 'error';
  message: string;
  page?: number;
  blockId?: string;
}

export type BlockClassification =
  | 'menu_item'
  | 'modifier'
  | 'ingredient_list'
  | 'instruction'
  | 'note'
  | 'noise';

export interface CandidateBlock {
  id: string;
  blocks: LayoutBlock[];
  mergedContent: string;
  segmentationType: 'menu_item_header' | 'body_text' | 'table_row' | 'list_entry' | 'ambiguous';
  suppressionReason?: string;
  suppressed: boolean;
}

export interface ClassificationResult {
  blockId: string;
  classification: BlockClassification;
  confidence: number;
  rationale: string;
  belongsToPreviousItem: boolean;
}

export interface MenuItem {
  kind: 'menu_item';
  name: string;
  description?: string;
  category?: string;
  servingSize?: string;
  dietaryFlags?: string[];
  modifiers?: string[];
  price?: number;
  sourceBlockIds: string[];
}

export interface Recipe {
  kind: 'recipe';
  name: string;
  ingredients: IngredientLine[];
  instructions: string[];
  yield?: string;
  prepTime?: string;
  sourceBlockIds: string[];
}

export interface IngredientLine {
  item: string;
  quantity?: number;
  unit?: string;
  preparation?: string;
}

export interface PrepTask {
  kind: 'prep_task';
  task: string;
  assignedTo?: string;
  deadline?: string;
  relatedItems?: string[];
  sourceBlockIds: string[];
}

export interface InventoryNeed {
  kind: 'inventory_need';
  item: string;
  quantity?: number;
  unit?: string;
  category?: string;
  urgency?: 'low' | 'medium' | 'high';
  sourceBlockIds: string[];
}

export interface StaffingAssignment {
  kind: 'staffing_assignment';
  role: string;
  person?: string;
  shift?: string;
  station?: string;
  eventDate?: string;
  sourceBlockIds: string[];
}

export type DomainEntity =
  | MenuItem
  | Recipe
  | PrepTask
  | InventoryNeed
  | StaffingAssignment;

export interface UnresolvedEntity {
  candidateBlockId: string;
  rawContent: string;
  attemptedType?: DomainEntity['kind'];
  reason: string;
  classification?: ClassificationResult;
}

export interface DiagnosticEntry {
  stage: 'extraction' | 'segmentation' | 'classification' | 'normalization' | 'validation';
  severity: 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export interface ParseResult {
  entities: DomainEntity[];
  unresolved: UnresolvedEntity[];
  diagnostics: DiagnosticEntry[];
  summary: {
    totalBlocksExtracted: number;
    blocksSuppressed: number;
    blocksClassified: number;
    entitiesProduced: number;
    unresolvedCount: number;
    averageConfidence: number;
  };
}

export interface PipelineConfig {
  confidenceThreshold: number;
  enableAI: boolean;
  aiModel?: string;
  aiApiKey?: string;
  aiBaseUrl?: string;
  doclingCommand?: string;
  ocrEnabled?: boolean;
  maxBlocksForAI?: number;
  suppressOrphanNumbers: boolean;
  suppressPageNumbers: boolean;
  minContentLength: number;
}

export const DEFAULT_CONFIG: PipelineConfig = {
  confidenceThreshold: 0.7,
  enableAI: false,
  suppressOrphanNumbers: true,
  suppressPageNumbers: true,
  minContentLength: 2,
};
