import { readFileSync } from "fs";
import { join } from "path";
import { describe, it } from "vitest";
import { compileToIR } from "./ir-compiler";
import { Parser } from "./parser";

const fixturesDir = join(import.meta.dirname, "conformance", "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("Parse Error Debug", () => {
  it("should show parse errors for fixture 04", () => {
    const source = loadFixture("04-command-mutate-emit.manifest");
    const parser = new Parser();
    const { program, errors } = parser.parse(source);

    console.log("=== Fixture 04 Parse Results ===");
    console.log("Entities:", program.entities.length);
    console.log("Commands:", program.commands.length);
    console.log("Events:", program.events.length);
    console.log("Stores:", program.stores.length);
    console.log("Parse errors:", errors.length);

    if (errors.length > 0) {
      console.log("Parse errors:", errors);
    }
  });

  it("should show parse errors for fixture 05", async () => {
    const source = loadFixture("05-guard-denial.manifest");
    const { ir, diagnostics } = await compileToIR(source);

    console.log("=== Fixture 05 IR Results ===");
    console.log("IR:", ir ? "GENERATED" : "NULL");
    console.log("Diagnostics:", diagnostics.length);

    if (diagnostics.length > 0) {
      console.log("Diagnostics:", diagnostics);
    }
  });

  it("should show parse errors for fixture 25", async () => {
    const source = loadFixture("25-command-constraints.manifest");
    const { ir, diagnostics } = await compileToIR(source);

    console.log("=== Fixture 25 IR Results ===");
    console.log("IR:", ir ? "GENERATED" : "NULL");
    console.log("Diagnostics:", diagnostics.length);

    if (diagnostics.length > 0) {
      diagnostics.forEach((d) => {
        console.log(
          `  [${d.severity}] ${d.message} at line ${d.line}:${d.column}`
        );
      });
    }
  });

  it("should show parse errors for fixture 27", async () => {
    const source = loadFixture("27-vnext-integration.manifest");
    const { ir, diagnostics } = await compileToIR(source);

    console.log("=== Fixture 27 IR Results ===");
    console.log("IR:", ir ? "GENERATED" : "NULL");
    console.log("Diagnostics:", diagnostics.length);

    if (diagnostics.length > 0) {
      diagnostics.forEach((d) => {
        console.log(
          `  [${d.severity}] ${d.message} at line ${d.line}:${d.column}`
        );
      });
    }
  });
});
