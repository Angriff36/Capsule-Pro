import type {
  CandidateBlock,
  ClassificationResult,
  StaffingAssignment,
  UnresolvedEntity,
  DiagnosticEntry,
  PipelineConfig,
} from '../types/domain-types.js';
import { validateEntity } from '../validation/schemas.js';

interface StaffingNormalizationOutput {
  assignments: StaffingAssignment[];
  unresolved: UnresolvedEntity[];
  diagnostics: DiagnosticEntry[];
}

export function normalizeStaffingEntities(
  candidates: CandidateBlock[],
  classifications: ClassificationResult[],
  config: PipelineConfig
): StaffingNormalizationOutput {
  const diagnostics: DiagnosticEntry[] = [];
  const assignments: StaffingAssignment[] = [];
  const unresolved: UnresolvedEntity[] = [];

  const classMap = new Map(classifications.map((c) => [c.blockId, c]));
  const active = candidates.filter((c) => !c.suppressed);

  for (const candidate of active) {
    const classification = classMap.get(candidate.id);
    if (!classification) continue;

    if (classification.classification !== 'note' && classification.classification !== 'instruction') {
      continue;
    }

    if (!looksLikeStaffing(candidate.mergedContent)) continue;

    if (classification.confidence < config.confidenceThreshold) {
      unresolved.push({
        candidateBlockId: candidate.id,
        rawContent: candidate.mergedContent,
        attemptedType: 'staffing_assignment',
        reason: `Confidence ${classification.confidence.toFixed(2)} below threshold`,
        classification,
      });
      continue;
    }

    const parsed = parseStaffingBlock(candidate);
    for (const assignment of parsed) {
      const validation = validateEntity(assignment);
      if (validation.success) {
        assignments.push(assignment);
      } else {
        unresolved.push({
          candidateBlockId: candidate.id,
          rawContent: candidate.mergedContent,
          attemptedType: 'staffing_assignment',
          reason: `Validation failed: ${validation.errors?.issues.map((i) => i.message).join(', ')}`,
          classification,
        });
      }
    }
  }

  diagnostics.push({
    stage: 'normalization',
    severity: 'info',
    message: `Staffing normalization: ${assignments.length} assignments extracted`,
  });

  return { assignments, unresolved, diagnostics };
}

function looksLikeStaffing(content: string): boolean {
  const lower = content.toLowerCase();
  return /\b(station|shift|am\b|pm\b|role|assigned|chef|cook|sous|line|grill|saut[ée]|prep|pastry|dishwash)\b/i.test(lower) &&
    /[A-Z][a-z]+\s+[A-Z]\.?/.test(content);
}

function parseStaffingBlock(candidate: CandidateBlock): StaffingAssignment[] {
  const lines = candidate.mergedContent.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: StaffingAssignment[] = [];

  for (const line of lines) {
    const parsed = parseStaffingLine(line, candidate.id);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

function parseStaffingLine(line: string, blockId: string): StaffingAssignment | null {
  const stationPattern = /^station\s+(\d+):\s*(\w+(?:\s+\w+)?)\s*[—–-]\s*(.+?)(?:\((.+?)\))?$/i;
  const stationMatch = line.match(stationPattern);

  if (stationMatch) {
    const stationNum = stationMatch[1];
    const role = stationMatch[2].trim();
    const person = stationMatch[3].trim();
    const shift = stationMatch[4]?.trim();

    return {
      kind: 'staffing_assignment',
      role,
      person,
      station: `Station ${stationNum}`,
      shift,
      sourceBlockIds: [blockId],
    };
  }

  const rolePersonPattern = /^(\w+(?:\s+\w+)?)\s*[:\-—–]\s*([A-Z][a-z]+\s+[A-Z]\.?\s*\w*)/;
  const roleMatch = line.match(rolePersonPattern);

  if (roleMatch) {
    const role = roleMatch[1].trim();
    const person = roleMatch[2].trim();
    const shiftMatch = line.match(/\((.*?shift.*?|.*?[AP]M.*?)\)/i);

    return {
      kind: 'staffing_assignment',
      role,
      person,
      shift: shiftMatch?.[1]?.trim(),
      sourceBlockIds: [blockId],
    };
  }

  return null;
}
