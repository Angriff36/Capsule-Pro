import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WORKFLOW_MARKER =
  /PrepListFinalized|prepInventoryDemand|PrepInventoryDemand|kitchen\.preplist\.finalized|InventoryReserved|InventoryItem\.reserve/;
const DIRECT_WRITE =
  /\b(?:database|prisma)\.[A-Za-z0-9_]+\.(?:create|update|upsert|delete|createMany|updateMany|deleteMany)\s*\(/;

const SCAN_ROOTS = ["apps/api/app", "apps/app/app", "packages"];
const EXTENSIONS = new Set([".ts", ".tsx"]);

describe("prep inventory demand direct-write guardrail", () => {
  it("does not implement prep-to-inventory demand through app/package Prisma writes", () => {
    const offenders: string[] = [];

    for (const root of SCAN_ROOTS) {
      for (const file of walk(join(process.cwd(), "../..", root))) {
        const source = readFileSync(file, "utf-8");
        if (WORKFLOW_MARKER.test(source) && DIRECT_WRITE.test(source)) {
          offenders.push(file);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === ".next" ||
        entry === "dist" ||
        entry === "coverage" ||
        entry === "__tests__"
      ) {
        continue;
      }
      yield* walk(path);
      continue;
    }

    const extension = path.slice(path.lastIndexOf("."));
    if (EXTENSIONS.has(extension)) {
      yield path;
    }
  }
}
