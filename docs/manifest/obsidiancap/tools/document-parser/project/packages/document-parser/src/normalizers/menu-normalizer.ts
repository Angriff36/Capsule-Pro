import type {
  CandidateBlock,
  ClassificationResult,
  MenuItem,
  Recipe,
  IngredientLine,
  PrepTask,
  UnresolvedEntity,
  DiagnosticEntry,
  PipelineConfig,
} from '../types/domain-types.js';
import { validateEntity } from '../validation/schemas.js';

interface MenuNormalizationOutput {
  menuItems: MenuItem[];
  recipes: Recipe[];
  prepTasks: PrepTask[];
  unresolved: UnresolvedEntity[];
  diagnostics: DiagnosticEntry[];
}

export function normalizeMenuEntities(
  candidates: CandidateBlock[],
  classifications: ClassificationResult[],
  config: PipelineConfig
): MenuNormalizationOutput {
  const diagnostics: DiagnosticEntry[] = [];
  const menuItems: MenuItem[] = [];
  const recipes: Recipe[] = [];
  const prepTasks: PrepTask[] = [];
  const unresolved: UnresolvedEntity[] = [];

  const classMap = new Map(classifications.map((c) => [c.blockId, c]));
  const active = candidates.filter((c) => !c.suppressed);

  let currentItem: Partial<MenuItem> & { sourceBlockIds: string[] } | null = null;

  for (const candidate of active) {
    const classification = classMap.get(candidate.id);
    if (!classification) continue;

    if (classification.confidence < config.confidenceThreshold) {
      unresolved.push({
        candidateBlockId: candidate.id,
        rawContent: candidate.mergedContent,
        attemptedType: mapClassificationToKind(classification.classification),
        reason: `Confidence ${classification.confidence.toFixed(2)} below threshold ${config.confidenceThreshold}`,
        classification,
      });
      continue;
    }

    switch (classification.classification) {
      case 'menu_item': {
        if (currentItem) {
          finalizeMenuItem(currentItem, menuItems, unresolved, diagnostics);
        }
        currentItem = buildMenuItem(candidate);
        break;
      }

      case 'modifier': {
        if (currentItem && classification.belongsToPreviousItem) {
          applyModifier(currentItem, candidate);
        } else {
          unresolved.push({
            candidateBlockId: candidate.id,
            rawContent: candidate.mergedContent,
            attemptedType: 'menu_item',
            reason: 'Modifier with no parent menu item',
            classification,
          });
        }
        break;
      }

      case 'ingredient_list': {
        if (currentItem) {
          finalizeMenuItem(currentItem, menuItems, unresolved, diagnostics);
          currentItem = null;
        }
        const recipe = buildRecipeFromIngredients(candidate);
        if (recipe) {
          const validation = validateEntity(recipe);
          if (validation.success) {
            recipes.push(recipe);
          } else {
            unresolved.push({
              candidateBlockId: candidate.id,
              rawContent: candidate.mergedContent,
              attemptedType: 'recipe',
              reason: `Validation failed: ${validation.errors?.issues.map((i) => i.message).join(', ')}`,
              classification,
            });
          }
        }
        break;
      }

      case 'instruction': {
        const task = buildPrepTask(candidate);
        if (task) {
          const validation = validateEntity(task);
          if (validation.success) {
            prepTasks.push(task);
          } else {
            unresolved.push({
              candidateBlockId: candidate.id,
              rawContent: candidate.mergedContent,
              attemptedType: 'prep_task',
              reason: `Validation failed: ${validation.errors?.issues.map((i) => i.message).join(', ')}`,
              classification,
            });
          }
        }
        break;
      }

      case 'note': {
        if (currentItem && classification.belongsToPreviousItem) {
          currentItem.description = [currentItem.description, candidate.mergedContent]
            .filter(Boolean)
            .join(' ');
          currentItem.sourceBlockIds.push(candidate.id);
        }
        break;
      }

      case 'noise': {
        diagnostics.push({
          stage: 'normalization',
          severity: 'info',
          message: `Skipping noise block: "${truncate(candidate.mergedContent, 40)}"`,
          details: { blockId: candidate.id },
        });
        break;
      }
    }
  }

  if (currentItem) {
    finalizeMenuItem(currentItem, menuItems, unresolved, diagnostics);
  }

  return { menuItems, recipes, prepTasks, unresolved, diagnostics };
}

function buildMenuItem(candidate: CandidateBlock): Partial<MenuItem> & { sourceBlockIds: string[] } {
  const lines = candidate.mergedContent.split('\n').map((l) => l.trim()).filter(Boolean);
  const name = lines[0] ?? '';
  const description = lines.slice(1).join(' ').trim() || undefined;

  return {
    kind: 'menu_item',
    name,
    description,
    sourceBlockIds: [candidate.id],
  };
}

function applyModifier(
  item: Partial<MenuItem> & { sourceBlockIds: string[] },
  candidate: CandidateBlock
): void {
  const content = candidate.mergedContent.trim();
  const flags = extractDietaryFlags(content);

  if (flags.length > 0) {
    item.dietaryFlags = [...(item.dietaryFlags ?? []), ...flags];
  }

  if (!flags.length) {
    item.modifiers = [...(item.modifiers ?? []), content];
  }

  item.sourceBlockIds.push(candidate.id);
}

function extractDietaryFlags(text: string): string[] {
  const flags: string[] = [];
  const patterns: [RegExp, string][] = [
    [/\bGF\b/i, 'gluten-free'],
    [/\bDF\b/i, 'dairy-free'],
    [/\bVG\b|vegan/i, 'vegan'],
    [/\bV\b|vegetarian/i, 'vegetarian'],
    [/nut.?free/i, 'nut-free'],
    [/gluten.?free/i, 'gluten-free'],
    [/dairy.?free/i, 'dairy-free'],
  ];

  for (const [pattern, flag] of patterns) {
    if (pattern.test(text) && !flags.includes(flag)) {
      flags.push(flag);
    }
  }

  return flags;
}

function buildRecipeFromIngredients(candidate: CandidateBlock): Recipe | null {
  const lines = candidate.mergedContent.split(/[,;\n]/).map((l) => l.trim()).filter(Boolean);
  const ingredients: IngredientLine[] = [];

  for (const line of lines) {
    const parsed = parseIngredientLine(line);
    if (parsed) {
      ingredients.push(parsed);
    }
  }

  if (ingredients.length === 0) return null;

  return {
    kind: 'recipe',
    name: 'Extracted Ingredients',
    ingredients,
    instructions: [],
    sourceBlockIds: [candidate.id],
  };
}

function parseIngredientLine(line: string): IngredientLine | null {
  const match = line.match(/^(\d+(?:\.\d+)?)\s*(lbs?|kg|g|oz|ml|l|cups?|tbsp|tsp|gallons?|pcs|pieces)?\s+(.+)$/i);
  if (match) {
    return {
      quantity: parseFloat(match[1]),
      unit: match[2]?.toLowerCase(),
      item: match[3].trim(),
    };
  }

  if (line.length > 2) {
    return { item: line };
  }

  return null;
}

function buildPrepTask(candidate: CandidateBlock): PrepTask | null {
  const content = candidate.mergedContent.trim();
  if (!content) return null;

  return {
    kind: 'prep_task',
    task: content,
    sourceBlockIds: [candidate.id],
  };
}

function finalizeMenuItem(
  partial: Partial<MenuItem> & { sourceBlockIds: string[] },
  menuItems: MenuItem[],
  unresolved: UnresolvedEntity[],
  diagnostics: DiagnosticEntry[]
): void {
  const item: MenuItem = {
    kind: 'menu_item',
    name: partial.name ?? '',
    description: partial.description,
    category: partial.category,
    servingSize: partial.servingSize,
    dietaryFlags: partial.dietaryFlags,
    modifiers: partial.modifiers,
    price: partial.price,
    sourceBlockIds: partial.sourceBlockIds,
  };

  const validation = validateEntity(item);
  if (validation.success) {
    menuItems.push(item);
  } else {
    unresolved.push({
      candidateBlockId: partial.sourceBlockIds[0],
      rawContent: partial.name ?? '',
      attemptedType: 'menu_item',
      reason: `Validation failed: ${validation.errors?.issues.map((i) => i.message).join(', ')}`,
    });
    diagnostics.push({
      stage: 'normalization',
      severity: 'warning',
      message: `Menu item "${truncate(partial.name ?? '', 30)}" failed validation`,
    });
  }
}

function mapClassificationToKind(classification: string): 'menu_item' | 'recipe' | 'prep_task' | undefined {
  switch (classification) {
    case 'menu_item':
    case 'modifier':
      return 'menu_item';
    case 'ingredient_list':
      return 'recipe';
    case 'instruction':
      return 'prep_task';
    default:
      return undefined;
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
