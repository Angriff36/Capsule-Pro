import type {
  CandidateBlock,
  ClassificationResult,
  BlockClassification,
  PipelineConfig,
  DiagnosticEntry,
} from '../types/domain-types.js';

interface ClassifierOutput {
  results: ClassificationResult[];
  diagnostics: DiagnosticEntry[];
}

const SYSTEM_PROMPT = `You are a document classification engine for catering and kitchen operations documents.

You will be given a block of text extracted from a catering document. Your job is to classify it into exactly one category.

Categories:
- menu_item: A dish or food item name, possibly with description
- modifier: A variant, dietary flag, or option for a menu item (e.g., "GF available", "add truffle +$5")
- ingredient_list: A list of ingredients with quantities
- instruction: A preparation instruction or chef note
- note: An operational note, reminder, or annotation
- noise: Irrelevant content like page numbers, decorative elements, or artifacts

You MUST respond with valid JSON only. No other text.

Response format:
{
  "classification": "<category>",
  "confidence": <0.0-1.0>,
  "rationale": "<brief explanation>",
  "belongs_to_previous": <true|false>
}

Rules:
- Do NOT invent information not present in the text
- Do NOT merge separate items
- If uncertain, lower your confidence score
- "belongs_to_previous" should be true only if the block clearly continues or modifies the prior block`;

export async function classify(
  candidates: CandidateBlock[],
  config: PipelineConfig
): Promise<ClassifierOutput> {
  const diagnostics: DiagnosticEntry[] = [];
  const results: ClassificationResult[] = [];

  const active = candidates.filter((c) => !c.suppressed);

  if (!config.enableAI || !config.aiApiKey) {
    diagnostics.push({
      stage: 'classification',
      severity: 'info',
      message: 'AI classification disabled. Using rule-based fallback.',
    });
    return {
      results: active.map((c) => classifyWithRules(c)),
      diagnostics,
    };
  }

  const limit = config.maxBlocksForAI ?? 100;
  const toClassify = active.slice(0, limit);

  if (active.length > limit) {
    diagnostics.push({
      stage: 'classification',
      severity: 'warning',
      message: `Truncated AI classification to ${limit} blocks (${active.length} total). Remaining blocks use rule-based fallback.`,
    });
  }

  for (const candidate of toClassify) {
    try {
      const result = await classifyWithAI(candidate, config);
      results.push(result);

      if (result.confidence < config.confidenceThreshold) {
        diagnostics.push({
          stage: 'classification',
          severity: 'warning',
          message: `Low confidence (${result.confidence.toFixed(2)}) for block "${truncate(candidate.mergedContent, 50)}": ${result.rationale}`,
          details: { blockId: candidate.id, confidence: result.confidence },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      diagnostics.push({
        stage: 'classification',
        severity: 'error',
        message: `AI classification failed for block ${candidate.id}: ${message}`,
        details: { blockId: candidate.id },
      });
      results.push(classifyWithRules(candidate));
    }
  }

  const overflow = active.slice(limit);
  for (const candidate of overflow) {
    results.push(classifyWithRules(candidate));
  }

  return { results, diagnostics };
}

async function classifyWithAI(
  candidate: CandidateBlock,
  config: PipelineConfig
): Promise<ClassificationResult> {
  const baseUrl = config.aiBaseUrl ?? 'https://api.anthropic.com';
  const model = config.aiModel ?? 'claude-sonnet-4-20250514';

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.aiApiKey!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Classify this block:\n\n---\n${candidate.mergedContent}\n---\n\nSegmentation type hint: ${candidate.segmentationType}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json() as { content?: { text?: string }[] };
  const text = body.content?.[0]?.text ?? '';

  const parsed = parseAIResponse(text);

  return {
    blockId: candidate.id,
    classification: parsed.classification,
    confidence: parsed.confidence,
    rationale: parsed.rationale,
    belongsToPreviousItem: parsed.belongs_to_previous,
  };
}

interface AIResponsePayload {
  classification: BlockClassification;
  confidence: number;
  rationale: string;
  belongs_to_previous: boolean;
}

function parseAIResponse(text: string): AIResponsePayload {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const validClassifications: BlockClassification[] = [
    'menu_item', 'modifier', 'ingredient_list', 'instruction', 'note', 'noise',
  ];

  if (!validClassifications.includes(parsed.classification)) {
    throw new Error(`Invalid classification: ${parsed.classification}`);
  }

  const confidence = Number(parsed.confidence);
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`Invalid confidence: ${parsed.confidence}`);
  }

  return {
    classification: parsed.classification,
    confidence,
    rationale: String(parsed.rationale ?? ''),
    belongs_to_previous: Boolean(parsed.belongs_to_previous),
  };
}

export function classifyWithRules(candidate: CandidateBlock): ClassificationResult {
  const content = candidate.mergedContent.toLowerCase();
  const segType = candidate.segmentationType;

  if (segType === 'menu_item_header') {
    return {
      blockId: candidate.id,
      classification: 'menu_item',
      confidence: 0.8,
      rationale: 'Heading-style block detected by segmenter',
      belongsToPreviousItem: false,
    };
  }

  if (/\b(gf|df|vg|vegan|vegetarian|gluten.?free|dairy.?free|nut.?free)\b/i.test(content)) {
    return {
      blockId: candidate.id,
      classification: 'modifier',
      confidence: 0.75,
      rationale: 'Contains dietary flag keywords',
      belongsToPreviousItem: true,
    };
  }

  if (/\b(need|order|stock|inventory|supply|lbs?|kg|gallons?)\b/i.test(content) &&
      /\d/.test(content)) {
    return {
      blockId: candidate.id,
      classification: 'ingredient_list',
      confidence: 0.65,
      rationale: 'Contains quantity + supply keywords',
      belongsToPreviousItem: false,
    };
  }

  if (/\b(station|shift|am|pm|role|assigned|chef|cook|sous|line)\b/i.test(content) &&
      /[A-Z][a-z]+\s+[A-Z]\.?/.test(candidate.mergedContent)) {
    return {
      blockId: candidate.id,
      classification: 'note',
      confidence: 0.6,
      rationale: 'Contains staffing-related keywords and name patterns',
      belongsToPreviousItem: false,
    };
  }

  if (/\b(prep|prepare|marinade|brine|chop|dice|blanch|reduce|soak)\b/i.test(content)) {
    return {
      blockId: candidate.id,
      classification: 'instruction',
      confidence: 0.6,
      rationale: 'Contains preparation instruction keywords',
      belongsToPreviousItem: false,
    };
  }

  if (/\b(note|reminder|important|attention|chef note)\b/i.test(content)) {
    return {
      blockId: candidate.id,
      classification: 'note',
      confidence: 0.6,
      rationale: 'Contains note/reminder keywords',
      belongsToPreviousItem: false,
    };
  }

  if (segType === 'body_text' && content.length > 20) {
    return {
      blockId: candidate.id,
      classification: 'menu_item',
      confidence: 0.4,
      rationale: 'Body text with food-like content (low confidence, needs review)',
      belongsToPreviousItem: true,
    };
  }

  return {
    blockId: candidate.id,
    classification: 'noise',
    confidence: 0.3,
    rationale: 'Could not determine classification with sufficient confidence',
    belongsToPreviousItem: false,
  };
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
