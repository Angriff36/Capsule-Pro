#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { markDone, readGraphragOutput } from "./lib/graphrag-state.mjs";

const input = JSON.parse(readFileSync(0, "utf8"));
const command =
  typeof input.tool_input?.command === "string" ? input.tool_input.command : "";

if (!/graphrag\.ps1/i.test(command)) {
  process.stdout.write("{}");
  process.exit(0);
}

const conversationId = input.conversation_id;
if (conversationId) {
  markDone(conversationId);
}

const output = readGraphragOutput();
const payload = output
  ? {
      additional_context: [
        "## GraphRAG output (injected by project hook — inspect these files first)",
        "",
        output,
      ].join("\n"),
    }
  : {};

process.stdout.write(JSON.stringify(payload));
