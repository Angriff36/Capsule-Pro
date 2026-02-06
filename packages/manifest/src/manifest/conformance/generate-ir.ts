import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { compileToIR } from "../ir-compiler";

async function generateIR() {
  const manifestPath = join(
    import.meta.dirname,
    "fixtures/kitchen-ops-full.manifest"
  );
  const irPath = join(import.meta.dirname, "expected/kitchen-ops-full.ir.json");

  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (diagnostics.filter((d) => d.severity === "error").length > 0) {
    console.error("Compilation errors:", diagnostics);
    process.exit(1);
  }

  if (!ir) {
    console.error("No IR generated");
    process.exit(1);
  }

  // Normalize for comparison
  const normalized = JSON.parse(JSON.stringify(ir));
  if (normalized.provenance) {
    normalized.provenance.compiledAt = "2024-01-01T00:00:00.000Z";
    normalized.provenance.contentHash = "normalized-content-hash";
    normalized.provenance.irHash = "normalized-ir-hash";
  }

  writeFileSync(irPath, JSON.stringify(normalized, null, 2));
  console.log(`IR generated: ${irPath}`);
}

generateIR().catch(console.error);
