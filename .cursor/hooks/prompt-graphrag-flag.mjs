#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { markRequired } from "./lib/graphrag-state.mjs";

/** Matches AGENTS.md "architecture/debugging" scope + common failure words. */
const ARCH_DEBUG =
  /\b(debug|debugging|fix|broken|error|fail(?:ed|ing|ure)?|timeout|architecture|manifest|investigate|diagnose|trace|performance|slow|commit|prisma|runtime|integration|root\s*cause|p2028|governed|command-board|eventdish|transaction|why\s+(?:is|does|are)|how\s+(?:does|do)\s+\w+\s+work)\b/i;

const input = JSON.parse(readFileSync(0, "utf8"));
const prompt = typeof input.prompt === "string" ? input.prompt : "";

if (ARCH_DEBUG.test(prompt) && input.conversation_id) {
  markRequired(input.conversation_id, prompt.slice(0, 800));
}

process.stdout.write(JSON.stringify({ continue: true }));
