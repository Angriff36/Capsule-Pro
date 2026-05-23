import type {
  CandidateBlock,
  ClassificationResult,
  InventoryNeed,
  UnresolvedEntity,
  DiagnosticEntry,
  PipelineConfig,
} from '../types/domain-types.js';
import { validateEntity } from '../validation/schemas.js';

interface InventoryNormalizationOutput {
  inventoryNeeds: InventoryNeed[];
  unresolved: UnresolvedEntity[];
  diagnostics: DiagnosticEntry[];
}

export function normalizeInventoryEntities(
  candidates: CandidateBlock[],
  classifications: ClassificationResult[],
  config: PipelineConfig
): InventoryNormalizationOutput {
  const diagnostics: DiagnosticEntry[] = [];
  const inventoryNeeds: InventoryNeed[] = [];
  const unresolved: UnresolvedEntity[] = [];

  const classMap = new Map(classifications.map((c) => [c.blockId, c]));
  const active = candidates.filter((c) => !c.suppressed);

  for (const candidate of active) {
    const classification = classMap.get(candidate.id);
    if (!classification) continue;

    if (classification.classification !== 'ingredient_list') continue;

    if (classification.confidence < config.confidenceThreshold) {
      unresolved.push({
        candidateBlockId: candidate.id,
        rawContent: candidate.mergedContent,
        attemptedType: 'inventory_need',
        reason: `Confidence ${classification.confidence.toFixed(2)} below threshold`,
        classification,
      });
      continue;
    }

    const items = extractInventoryItems(candidate);

    for (const item of items) {
      const validation = validateEntity(item);
      if (validation.success) {
        inventoryNeeds.push(item);
      } else {
        unresolved.push({
          candidateBlockId: candidate.id,
          rawContent: `${item.quantity ?? ''} ${item.unit ?? ''} ${item.item}`.trim(),
          attemptedType: 'inventory_need',
          reason: `Validation failed: ${validation.errors?.issues.map((i) => i.message).join(', ')}`,
          classification,
        });
      }
    }
  }

  diagnostics.push({
    stage: 'normalization',
    severity: 'info',
    message: `Inventory normalization: ${inventoryNeeds.length} items extracted`,
  });

  return { inventoryNeeds, unresolved, diagnostics };
}

function extractInventoryItems(candidate: CandidateBlock): InventoryNeed[] {
  const content = candidate.mergedContent;
  const items: InventoryNeed[] = [];

  const cleaned = content.replace(/^need:\s*/i, '');
  const segments = cleaned.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

  for (const segment of segments) {
    const parsed = parseInventorySegment(segment, candidate.id);
    if (parsed) {
      items.push(parsed);
    }
  }

  return items;
}

function parseInventorySegment(segment: string, blockId: string): InventoryNeed | null {
  const quantityMatch = segment.match(
    /^(\d+(?:\.\d+)?)\s*(lbs?|kg|g|oz|ml|l|cups?|tbsp|tsp|gallons?|pcs|pieces|cases?|boxes?|bags?|cans?|bottles?|bunches?|heads?|dozen)?\s+(.+)$/i
  );

  if (quantityMatch) {
    const quantity = parseFloat(quantityMatch[1]);
    const unit = quantityMatch[2]?.toLowerCase();
    const item = quantityMatch[3].trim();

    return {
      kind: 'inventory_need',
      item,
      quantity,
      unit: normalizeUnit(unit),
      category: guessCategory(item),
      urgency: guessUrgency(segment),
      sourceBlockIds: [blockId],
    };
  }

  if (segment.length > 2) {
    return {
      kind: 'inventory_need',
      item: segment,
      category: guessCategory(segment),
      sourceBlockIds: [blockId],
    };
  }

  return null;
}

function normalizeUnit(unit?: string): string | undefined {
  if (!unit) return undefined;
  const mapping: Record<string, string> = {
    lb: 'lbs',
    lbs: 'lbs',
    kg: 'kg',
    g: 'g',
    oz: 'oz',
    ml: 'ml',
    l: 'L',
    cup: 'cups',
    cups: 'cups',
    tbsp: 'tbsp',
    tsp: 'tsp',
    gallon: 'gallons',
    gallons: 'gallons',
    pcs: 'pcs',
    pieces: 'pcs',
    case: 'cases',
    cases: 'cases',
    box: 'boxes',
    boxes: 'boxes',
    bag: 'bags',
    bags: 'bags',
    can: 'cans',
    cans: 'cans',
    bottle: 'bottles',
    bottles: 'bottles',
    bunch: 'bunches',
    bunches: 'bunches',
    head: 'heads',
    heads: 'heads',
    dozen: 'dozen',
  };
  return mapping[unit] ?? unit;
}

function guessCategory(item: string): string | undefined {
  const lower = item.toLowerCase();

  const categories: [RegExp, string][] = [
    [/\b(salmon|tuna|cod|halibut|shrimp|lobster|crab|fish|seafood)\b/, 'seafood'],
    [/\b(beef|pork|chicken|lamb|veal|duck|turkey|ribs|steak|tenderloin)\b/, 'protein'],
    [/\b(potato|tomato|onion|garlic|lettuce|spinach|asparagus|carrot|celery|pepper|mushroom)\b/, 'produce'],
    [/\b(cream|butter|cheese|milk|yogurt)\b/, 'dairy'],
    [/\b(flour|sugar|salt|pepper|spice|oil|vinegar|sauce)\b/, 'pantry'],
    [/\b(wine|beer|spirit|liquor|champagne)\b/, 'beverage'],
  ];

  for (const [pattern, category] of categories) {
    if (pattern.test(lower)) return category;
  }

  return undefined;
}

function guessUrgency(text: string): InventoryNeed['urgency'] {
  const lower = text.toLowerCase();
  if (/\b(urgent|asap|immediately|critical)\b/.test(lower)) return 'high';
  if (/\b(soon|needed|running low)\b/.test(lower)) return 'medium';
  return undefined;
}
