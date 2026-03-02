/**
 * Quick MCP stdio test — sends a tools/list + tools/call and checks response.
 * Run: node packages/mcp-server/test-mcp.mjs
 */
import { spawn } from "node:child_process";

const server = spawn(
  "pnpm",
  [
    "exec",
    "tsx",
    "--require",
    "C:\\Projects\\capsule-pro\\packages\\mcp-server\\src\\preload.cts",
    "C:\\Projects\\capsule-pro\\packages\\mcp-server\\src\\index.ts",
  ],
  {
    cwd: "C:\\Projects\\capsule-pro",
    stdio: ["pipe", "pipe", "pipe"],
  }
);

let buffer = "";

server.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      console.log(
        "Response:",
        JSON.stringify(msg, null, 2).slice(0, 500) + "..."
      );
      if (msg.result?.tools) {
        console.log("\nTools:", msg.result.tools.map((t) => t.name).join(", "));
      }
      if (msg.result?.content) {
        console.log(
          "\nTool result:",
          JSON.stringify(msg.result).slice(0, 300) + "..."
        );
      }
    } catch {
      console.log("Raw:", line.slice(0, 100));
    }
  }
});

server.stderr.on("data", (d) => process.stderr.write(d));

server.on("error", (err) => {
  console.error("Spawn error:", err);
  process.exit(1);
});

function send(req) {
  const line = JSON.stringify(req) + "\n";
  server.stdin.write(line);
}

// Initialize + list tools
setTimeout(() => {
  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0" },
    },
  });
}, 500);

setTimeout(() => {
  send({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  });
}, 1500);

setTimeout(() => {
  send({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "query_ir_summary",
      arguments: {},
    },
  });
}, 2500);

setTimeout(() => {
  server.kill("SIGTERM");
  process.exit(0);
}, 5000);
