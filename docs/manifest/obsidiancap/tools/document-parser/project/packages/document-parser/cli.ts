#!/usr/bin/env node

import { parseDocument, formatDiagnosticsReport } from './src/index.js';
import type { PipelineConfig } from './src/types/domain-types.js';
import { writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const filePath = args[0];
  const format = parseFormat(args);
  const outputDir = parseArg(args, '--output') ?? '.';
  const confidenceThreshold = parseFloat(parseArg(args, '--threshold') ?? '0.7');
  const enableAI = args.includes('--ai');
  const aiApiKey = parseArg(args, '--api-key') ?? process.env.ANTHROPIC_API_KEY;
  const verbose = args.includes('--verbose') || args.includes('-v');

  if (!filePath) {
    console.error('Error: file path is required');
    process.exit(1);
  }

  const config: Partial<PipelineConfig> = {
    confidenceThreshold,
    enableAI,
    aiApiKey,
  };

  console.log(`Parsing: ${filePath} (format: ${format})`);
  console.log(`Confidence threshold: ${confidenceThreshold}`);
  console.log(`AI classification: ${enableAI ? 'enabled' : 'disabled (rule-based)'}`);
  console.log('');

  try {
    const result = await parseDocument(resolve(filePath), format, config);

    const baseName = basename(filePath, `.${format}`);
    const entitiesPath = resolve(outputDir, `${baseName}.entities.json`);
    const diagnosticsPath = resolve(outputDir, `${baseName}.diagnostics.json`);

    writeFileSync(entitiesPath, JSON.stringify(result.entities, null, 2));
    writeFileSync(diagnosticsPath, JSON.stringify({
      summary: result.summary,
      unresolved: result.unresolved,
      diagnostics: result.diagnostics,
    }, null, 2));

    console.log(formatDiagnosticsReport(result));
    console.log('');
    console.log(`Entities written to: ${entitiesPath}`);
    console.log(`Diagnostics written to: ${diagnosticsPath}`);

    if (verbose) {
      console.log('');
      console.log('Full entity output:');
      console.log(JSON.stringify(result.entities, null, 2));
    }

    if (result.unresolved.length > 0) {
      process.exit(2);
    }
  } catch (err) {
    console.error('Fatal error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function parseFormat(args: string[]): 'pdf' | 'csv' | 'tpp' {
  const typeArg = parseArg(args, '--type');
  if (typeArg === 'pdf' || typeArg === 'csv' || typeArg === 'tpp') {
    return typeArg;
  }

  const filePath = args[0];
  if (filePath?.endsWith('.pdf')) return 'pdf';
  if (filePath?.endsWith('.csv')) return 'csv';
  if (filePath?.endsWith('.tpp')) return 'tpp';

  return 'pdf';
}

function parseArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  const eqArg = args.find((a) => a.startsWith(`${flag}=`));
  if (eqArg) {
    return eqArg.split('=').slice(1).join('=');
  }
  return undefined;
}

function printUsage(): void {
  console.log(`
@capsule-pro/document-parser — Catering Document Parser

Usage:
  parse-documents <file> [options]

Options:
  --type=pdf|csv|tpp    Document format (auto-detected from extension)
  --threshold <n>       Confidence threshold (default: 0.7)
  --ai                  Enable AI-assisted classification
  --api-key <key>       Anthropic API key (or set ANTHROPIC_API_KEY env var)
  --output <dir>        Output directory (default: current directory)
  --verbose, -v         Print full entity output
  --help, -h            Show this help

Output:
  <filename>.entities.json      Validated, normalized domain entities
  <filename>.diagnostics.json   Diagnostics, unresolved items, and summary

Exit codes:
  0  All entities resolved
  1  Fatal error
  2  Parse completed with unresolved items requiring review
`.trim());
}

main();
