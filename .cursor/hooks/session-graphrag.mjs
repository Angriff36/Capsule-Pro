#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { GRAPHRAG_SHELL } from "./lib/graphrag-state.mjs";

const input = JSON.parse(readFileSync(0, "utf8"));

const additional_context = [
  "## ENFORCED: GraphRAG (project hook in .cursor/hooks.json)",
  "",
  "For architecture/debugging tasks, a hook blocks exploration tools until GraphRAG runs.",
  "",
  "When flagged, run Shell FIRST:",
  GRAPHRAG_SHELL,
  "",
  "Output: C:\\Users\\Ryan\\Documents\\chatgptoutput.txt",
  "Read TOP SOURCE FILES from that output before Grep/Read/SemanticSearch/Glob/Task.",
].join("\n");

process.stdout.write(JSON.stringify({ additional_context }));
