#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { normalize } from "node:path";
import {
  DENY_MESSAGE,
  isGraphragDone,
  isGraphragRequired,
} from "./lib/graphrag-state.mjs";

const input = JSON.parse(readFileSync(0, "utf8"));
const conversationId = input.conversation_id;
const toolName = input.tool_name ?? "";
const toolInput = input.tool_input ?? {};

function allow() {
  process.stdout.write(JSON.stringify({ permission: "allow" }));
}

function deny() {
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message: "GraphRAG required before exploration (project hook).",
      agent_message: DENY_MESSAGE,
    })
  );
}

if (!conversationId || !isGraphragRequired(conversationId) || isGraphragDone(conversationId)) {
  allow();
  process.exit(0);
}

if (toolName === "Read") {
  const rawPath = typeof toolInput.path === "string" ? toolInput.path : "";
  const p = normalize(rawPath).replace(/\\/g, "/").toLowerCase();
  const allowed =
    p.endsWith("/agents.md") ||
    p.endsWith("/constitution.md") ||
    p.includes("/manifest/agents.md") ||
    p.includes("/scripts/graphrag.ps1") ||
    p.includes("/graphify-out/") ||
    p.includes("/.cursor/hooks/") ||
    p.includes("/node_modules/next/dist/docs/");
  if (allowed) {
    allow();
    process.exit(0);
  }
}

deny();
process.exit(0);
