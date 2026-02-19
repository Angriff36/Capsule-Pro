import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTE_PATH = resolve(
  process.cwd(),
  "app/api/command-board/chat/route.ts"
);

describe("command board chat route runtime", () => {
  it("enforces Node.js runtime and does not allow Edge", async () => {
    const content = await readFile(ROUTE_PATH, "utf8");

    expect(content).toMatch(/export const runtime\s*=\s*['\"]nodejs['\"]/);
    expect(content).not.toMatch(/export const runtime\s*=\s*['\"]edge['\"]/);
  });
});
