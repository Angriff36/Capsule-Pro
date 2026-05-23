import type {
  DiagnosticEntry,
  ParseResult,
  DomainEntity,
  UnresolvedEntity,
} from '../types/domain-types.js';

export function buildParseResult(
  entities: DomainEntity[],
  unresolved: UnresolvedEntity[],
  diagnostics: DiagnosticEntry[],
  stats: {
    totalBlocksExtracted: number;
    blocksSuppressed: number;
    blocksClassified: number;
    confidenceScores: number[];
  }
): ParseResult {
  const avgConfidence =
    stats.confidenceScores.length > 0
      ? stats.confidenceScores.reduce((a, b) => a + b, 0) / stats.confidenceScores.length
      : 0;

  return {
    entities,
    unresolved,
    diagnostics,
    summary: {
      totalBlocksExtracted: stats.totalBlocksExtracted,
      blocksSuppressed: stats.blocksSuppressed,
      blocksClassified: stats.blocksClassified,
      entitiesProduced: entities.length,
      unresolvedCount: unresolved.length,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
    },
  };
}

export function formatDiagnosticsReport(result: ParseResult): string {
  const lines: string[] = [];

  lines.push('=== Document Parse Report ===');
  lines.push('');
  lines.push('Summary:');
  lines.push(`  Blocks extracted:  ${result.summary.totalBlocksExtracted}`);
  lines.push(`  Blocks suppressed: ${result.summary.blocksSuppressed}`);
  lines.push(`  Blocks classified: ${result.summary.blocksClassified}`);
  lines.push(`  Entities produced: ${result.summary.entitiesProduced}`);
  lines.push(`  Unresolved:        ${result.summary.unresolvedCount}`);
  lines.push(`  Avg confidence:    ${result.summary.averageConfidence}`);
  lines.push('');

  const entityGroups = groupBy(result.entities, (e) => e.kind);
  lines.push('Entities by type:');
  for (const [kind, items] of Object.entries(entityGroups)) {
    lines.push(`  ${kind}: ${items.length}`);
  }
  lines.push('');

  if (result.unresolved.length > 0) {
    lines.push('Unresolved items:');
    for (const item of result.unresolved) {
      lines.push(`  [${item.attemptedType ?? 'unknown'}] ${truncate(item.rawContent, 60)}`);
      lines.push(`    Reason: ${item.reason}`);
    }
    lines.push('');
  }

  const warnings = result.diagnostics.filter((d) => d.severity === 'warning');
  const errors = result.diagnostics.filter((d) => d.severity === 'error');

  if (errors.length > 0) {
    lines.push(`Errors (${errors.length}):`);
    for (const entry of errors) {
      lines.push(`  [${entry.stage}] ${entry.message}`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push(`Warnings (${warnings.length}):`);
    for (const entry of warnings) {
      lines.push(`  [${entry.stage}] ${entry.message}`);
    }
    lines.push('');
  }

  lines.push('=== End Report ===');
  return lines.join('\n');
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
