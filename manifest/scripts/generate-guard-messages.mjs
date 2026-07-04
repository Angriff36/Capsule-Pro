#!/usr/bin/env node
/**
 * Extract authored guard messages from Manifest DSL sources.
 *
 * WHY: guard lines author human messages (`guard yieldQty > 0 "Yield quantity
 * must be positive"`), but the compiler drops them — the parser re-parses the
 * trailing string as an inert compute action, and the IR guard nodes carry no
 * message slot. Until upstream @angriff36/manifest compiles guard messages
 * into the IR, this build-time seam scans manifest/source and emits an
 * { "Entity.command": [message|null, ...] } table, index-aligned with the IR
 * guard order (the runtime's guardFailure.index is 1-based; these arrays are
 * 0-based, so consumers read `messages[index - 1]`).
 *
 * DELETE this script, manifest/generated/guard-messages.json, and the
 * guardMessageFor() reader in apps/api/lib/manifest/friendly-error-mapper.ts
 * when upstream adds native guard messages. See manifest/notes.md.
 *
 * Usage: node manifest/scripts/generate-guard-messages.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const sourceDir = resolve(root, "manifest/source");
const outPath = resolve(root, "manifest/generated/guard-messages.json");

/** guard/when line with a trailing quoted message. */
const GUARD_WITH_MESSAGE = /^\s*(?:guard|when)\s+(.*?)\s*"([^"]*)"\s*$/;
/** Any guard/when line (message-less guards still occupy an index slot). */
const GUARD_LINE = /^\s*(?:guard|when)\s+/;
/**
 * A captured "message" whose preceding expression ends in an operator is
 * actually the guard's own trailing string literal (e.g.
 * `guard self.status == "parsing"`), not an authored message.
 */
const DANGLING_OPERATOR =
  /(?:==|!=|>=|<=|>|<|\+|-|\*|\/|\(|,|\b(?:in|and|or|not))\s*$/;

const ENTITY_OPEN = /^\s*entity\s+([A-Za-z_]\w*)/;
const COMMAND_OPEN = /^\s*command\s+([A-Za-z_]\w*)\s*\(/;
const STRING_LITERAL = /"[^"]*"/g;
const LINE_COMMENT = /\/\/.*$/;
const LINE_SPLIT = /\r?\n/;
const OPEN_BRACE = /\{/g;
const CLOSE_BRACE = /\}/g;

function collectManifestFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      files.push(...collectManifestFiles(full));
    } else if (name.name.endsWith(".manifest")) {
      files.push(full);
    }
  }
  return files.sort();
}

/**
 * Classify a line as a guard slot: `undefined` when it is not a guard line,
 * the authored message string when one exists, or `null` for a message-less
 * guard (which still occupies an index slot to preserve alignment).
 */
function guardSlotFromLine(line) {
  if (!GUARD_LINE.test(line)) {
    return;
  }
  const withMessage = line.match(GUARD_WITH_MESSAGE);
  if (
    withMessage &&
    withMessage[2].length > 0 &&
    !DANGLING_OPERATOR.test(withMessage[1])
  ) {
    return withMessage[2];
  }
  return null;
}

/** Net brace depth change, ignoring braces inside strings and comments. */
function braceDelta(line) {
  const sanitized = line
    .replace(STRING_LITERAL, '""')
    .replace(LINE_COMMENT, "");
  return (
    (sanitized.match(OPEN_BRACE) ?? []).length -
    (sanitized.match(CLOSE_BRACE) ?? []).length
  );
}

/** Flush the current command/entity blocks when depth falls back to them. */
function closeBlocks(state, table) {
  if (state.command && state.depth <= state.commandDepth) {
    if (state.messages.length > 0) {
      table[`${state.entity}.${state.command}`] = state.messages;
    }
    state.command = undefined;
  }
  if (state.entity && state.depth <= state.entityDepth) {
    state.entity = undefined;
  }
}

function scanLine(line, state, table) {
  const entityMatch = line.match(ENTITY_OPEN);
  if (entityMatch) {
    state.entity = entityMatch[1];
    state.entityDepth = state.depth;
  }
  const commandMatch = state.entity ? line.match(COMMAND_OPEN) : null;
  if (commandMatch) {
    state.command = commandMatch[1];
    state.commandDepth = state.depth;
    state.messages = [];
  } else if (state.command) {
    const slot = guardSlotFromLine(line);
    if (slot !== undefined) {
      state.messages.push(slot);
    }
  }
  state.depth += braceDelta(line);
  closeBlocks(state, table);
}

function extractGuardMessages(files) {
  const table = {};
  for (const file of files) {
    const state = {
      depth: 0,
      entity: undefined,
      entityDepth: 0,
      command: undefined,
      commandDepth: 0,
      messages: [],
    };
    for (const line of readFileSync(file, "utf8").split(LINE_SPLIT)) {
      scanLine(line, state, table);
    }
  }
  return table;
}

const files = collectManifestFiles(sourceDir);
const table = extractGuardMessages(files);
const sorted = Object.fromEntries(
  Object.keys(table)
    .sort()
    .map((key) => [key, table[key]])
);

writeFileSync(outPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

const commandCount = Object.keys(sorted).length;
const messageCount = Object.values(sorted)
  .flat()
  .filter((m) => m !== null).length;
console.log(
  `guard-messages: ${messageCount} authored messages across ${commandCount} commands (from ${files.length} .manifest files) -> ${outPath}`
);
