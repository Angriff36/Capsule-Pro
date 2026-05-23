/**
 * Manifest Comprehensive Verification Test Suite for Capsule-Pro
 * 
 * This test suite HUNTS FOR ISSUES. When it finds a problem, it expands to find
 * ALL related issues across ALL manifests, not just the first one.
 * 
 * Run with: npx vitest run scripts/manifest-verification.test.ts
 * Or run all tests: npx vitest run
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { RuntimeEngine, type RuntimeOptions, type EntityInstance } from "@angriff36/manifest";
import type { IR, IRConstraint } from "@angriff36/manifest/ir";

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  manifestDir: "./packages/manifest-adapters/manifests",
  generatedRoutesDir: "./apps/api/app/api",
};

// ============================================================================
// TYPES
// ============================================================================

type Severity = "error" | "warning" | "info";

interface Diagnostic {
  file: string;
  entity?: string;
  command?: string;
  issue: string;
  severity: Severity;
  suggestion?: string;
  context?: Record<string, unknown>;
}

interface CompiledManifest {
  file: string;
  ir: IR | null;
  diagnostics: unknown[];
}

// ============================================================================
// HELPERS
// ============================================================================

function getAllManifests(): string[] {
  if (!existsSync(config.manifestDir)) return [];
  return readdirSync(config.manifestDir).filter((f) => f.endsWith(".manifest"));
}

function loadManifest(file: string): string {
  const path = join(config.manifestDir, file);
  if (!existsSync(path)) throw new Error(`Manifest file not found: ${path}`);
  return readFileSync(path, "utf-8");
}

async function compileManifest(file: string): Promise<CompiledManifest> {
  const source = loadManifest(file);
  const result = await compileToIR(source);
  return { file, ir: result.ir ?? null, diagnostics: result.diagnostics ?? [] };
}

/**
 * Compile inline manifest source and THROW if compilation fails.
 * This ensures tests can never silently paper over language violations.
 * The compiler is the authority - diagnostics are dumped verbatim.
 */
async function compileOrThrow(source: string, testName?: string): Promise<IR> {
  const result = await compileToIR(source);
  
  if (!result.ir) {
    const diags = result.diagnostics ?? [];
    const errorDetails = diags.map((d: unknown) => {
      const diag = d as { severity?: string; message?: string; line?: number };
      return `  - ${diag.severity ?? 'error'}: ${diag.message ?? String(d)}${diag.line ? ` (line ${diag.line})` : ''}`;
    }).join('\n');
    
    throw new Error(
      `Manifest compilation failed${testName ? ` in ${testName}` : ''}:\n` +
      `Compiler diagnostics:\n${errorDetails}\n\n` +
      `Source:\n${source.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')}`
    );
  }
  
  return result.ir;
}

function createDeterministicOptions(): RuntimeOptions {
  let idCounter = 0;
  return {
    generateId: () => `test-id-${++idCounter}`,
    now: () => 1000000000000,
  };
}

function groupBy<T>(items: T[], keyFn: (t: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = keyFn(item);
    acc[k] ??= [];
    acc[k].push(item);
    return acc;
  }, {});
}

function formatDiagnosticReport(diags: Diagnostic[]): string {
  if (diags.length === 0) return "No issues found";
  
  const byFile = groupBy(diags, (d) => d.file);
  const lines: string[] = [];
  
  for (const [file, fileDiags] of Object.entries(byFile)) {
    lines.push(`\n${file}:`);
    for (const d of fileDiags) {
      const where = [d.entity, d.command].filter(Boolean).join(".");
      const location = where ? ` [${where}]` : "";
      lines.push(`  - ${d.severity.toUpperCase()}: ${d.issue}${location}`);
      if (d.suggestion) lines.push(`    → ${d.suggestion}`);
    }
  }
  
  return lines.join("\n");
}

// ============================================================================
// 1. IR STRUCTURE VALIDATION
// ============================================================================

describe("1. IR Structure Validation", () => {
  it("ALL manifests compile and have required top-level IR fields", async () => {
    const manifests = getAllManifests();
    expect(manifests.length, "No manifests found").toBeGreaterThan(0);
    
    const diags: Diagnostic[] = [];
    
    for (const file of manifests) {
      const { ir, diagnostics: compileDiags } = await compileManifest(file);
      
      if (!ir) {
        diags.push({
          file,
          issue: "Compilation failed",
          severity: "error",
          suggestion: "Fix manifest syntax errors",
          context: { compileDiagnostics: compileDiags },
        });
        continue;
      }
      
      const missing: string[] = [];
      if (!ir.version) missing.push("version");
      if (!ir.provenance) missing.push("provenance");
      if (!Array.isArray(ir.modules)) missing.push("modules");
      if (!Array.isArray(ir.entities)) missing.push("entities");
      if (!Array.isArray(ir.stores)) missing.push("stores");
      if (!Array.isArray(ir.events)) missing.push("events");
      if (!Array.isArray(ir.commands)) missing.push("commands");
      if (!Array.isArray(ir.policies)) missing.push("policies");
      
      if (missing.length > 0) {
        diags.push({
          file,
          issue: `Missing required IR fields: ${missing.join(", ")}`,
          severity: "error",
          suggestion: "Check compiler output - these fields should always be present",
        });
      }
    }
    
    expect(diags, formatDiagnosticReport(diags)).toHaveLength(0);
  });

  it("ALL manifests have valid provenance with SHA-256 content hash", async () => {
    const manifests = getAllManifests();
    const diags: Diagnostic[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      if (!ir.provenance.contentHash) {
        diags.push({ file, issue: "Missing contentHash", severity: "error" });
      } else if (ir.provenance.contentHash.length !== 64) {
        diags.push({
          file,
          issue: `contentHash not SHA-256 (length: ${ir.provenance.contentHash.length})`,
          severity: "error",
        });
      }
      
      if (!ir.provenance.compilerVersion) {
        diags.push({ file, issue: "Missing compilerVersion", severity: "warning" });
      }
      if (!ir.provenance.schemaVersion) {
        diags.push({ file, issue: "Missing schemaVersion", severity: "warning" });
      }
      if (!ir.provenance.compiledAt) {
        diags.push({ file, issue: "Missing compiledAt", severity: "warning" });
      }
    }
    
    expect(diags, formatDiagnosticReport(diags)).toHaveLength(0);
  });

  it("ALL entities have required structure (properties, constraints, etc)", async () => {
    const manifests = getAllManifests();
    const diags: Diagnostic[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      for (const entity of ir.entities) {
        if (!Array.isArray(entity.properties)) {
          diags.push({ file, entity: entity.name, issue: "Missing properties array", severity: "error" });
        }
        if (!Array.isArray(entity.computedProperties)) {
          diags.push({ file, entity: entity.name, issue: "Missing computedProperties array", severity: "error" });
        }
        if (!Array.isArray(entity.relationships)) {
          diags.push({ file, entity: entity.name, issue: "Missing relationships array", severity: "error" });
        }
        if (!Array.isArray(entity.constraints)) {
          diags.push({ file, entity: entity.name, issue: "Missing constraints array", severity: "error" });
        }
        if (!Array.isArray(entity.commands)) {
          diags.push({ file, entity: entity.name, issue: "Missing commands array", severity: "error" });
        }
      }
    }
    
    expect(diags, formatDiagnosticReport(diags)).toHaveLength(0);
  });
});

// ============================================================================
// 2. POLICY COVERAGE - SECURITY DRIFT DETECTION
// ============================================================================

describe("2. Policy Coverage (Security)", () => {
  it("ALL commands have policies defined - find security gaps", async () => {
    const manifests = getAllManifests();
    const missing: { file: string; entity: string; command: string }[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      for (const cmd of ir.commands) {
        if (!cmd.entity) continue;
        
        const policyCount = (cmd.policies ?? []).length;
        if (policyCount === 0) {
          missing.push({ file, entity: cmd.entity, command: cmd.name });
        }
      }
    }
    
    const byFile = groupBy(missing, (m) => m.file);
    const report = Object.entries(byFile)
      .map(([file, items]) => {
        const commands = items.map((m) => `${m.entity}.${m.command}`).join(", ");
        return `\n${file}:\n  ${commands}`;
      })
      .join("");
    
    expect(
      missing,
      `SECURITY RISK: ${missing.length} commands have NO policies (anyone can execute):${report}`,
    ).toHaveLength(0);
  });

  it("ALL policies have valid action types", async () => {
    const manifests = getAllManifests();
    const validActions = new Set(["read", "write", "delete", "execute", "all", "override"]);
    const invalid: { file: string; policy: string; action: string }[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      for (const policy of ir.policies) {
        if (!validActions.has(policy.action)) {
          invalid.push({ file, policy: policy.name, action: policy.action });
        }
      }
    }
    
    expect(
      invalid,
      `Invalid policy actions:\n${invalid.map((i) => `${i.file}: ${i.policy} has action "${i.action}"`).join("\n")}`,
    ).toHaveLength(0);
  });

  it("Execute policies reference user context (no open authorization)", async () => {
    const manifests = getAllManifests();
    const suspicious: { file: string; policy: string }[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      for (const policy of ir.policies) {
        if (policy.action === "execute") {
          const expr = JSON.stringify(policy.expression);
          if (!expr.includes("user")) {
            suspicious.push({ file, policy: policy.name });
          }
        }
      }
    }
    
    expect(
      suspicious,
      `Execute policies without user context (may be open to anyone):\n${suspicious.map((s) => `${s.file}: ${s.policy}`).join("\n")}`,
    ).toHaveLength(0);
  });
});

// ============================================================================
// 3. STORE CONFIGURATION
// ============================================================================

describe("3. Store Configuration", () => {
  it("ALL stores use valid targets", async () => {
    const manifests = getAllManifests();
    const validTargets = new Set(["memory", "localStorage", "postgres", "supabase"]);
    const invalid: { file: string; entity: string; target: string }[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      for (const store of ir.stores) {
        if (!validTargets.has(store.target)) {
          invalid.push({ file, entity: store.entity, target: store.target });
        }
      }
    }
    
    expect(
      invalid,
      `Invalid store targets:\n${invalid.map((i) => `${i.file}: ${i.entity} uses "${i.target}"`).join("\n")}\n\nValid targets: ${[...validTargets].join(", ")}`,
    ).toHaveLength(0);
  });

  it("Each entity has exactly ONE store", async () => {
    const manifests = getAllManifests();
    const noStore: { file: string; entity: string }[] = [];
    const multipleStores: { file: string; entity: string; count: number }[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      for (const entity of ir.entities) {
        const storesForEntity = ir.stores.filter((s) => s.entity === entity.name);
        if (storesForEntity.length === 0) {
          noStore.push({ file, entity: entity.name });
        } else if (storesForEntity.length > 1) {
          multipleStores.push({ file, entity: entity.name, count: storesForEntity.length });
        }
      }
    }
    
    const issues: string[] = [];
    if (noStore.length > 0) {
      issues.push(`Entities WITHOUT store:\n${noStore.map((n) => `${n.file}: ${n.entity}`).join("\n")}`);
    }
    if (multipleStores.length > 0) {
      issues.push(`Entities with MULTIPLE stores:\n${multipleStores.map((m) => `${m.file}: ${m.entity} (${m.count} stores)`).join("\n")}`);
    }
    
    expect(issues, issues.join("\n\n")).toHaveLength(0);
  });
});

// ============================================================================
// 4. ROUTE GENERATION VERIFICATION
// ============================================================================

describe("4. Route Generation", () => {
  it("ALL route files have HTTP method exports", () => {
    const apiDir = config.generatedRoutesDir;
    if (!existsSync(apiDir)) {
      throw new Error(`API directory not found: ${apiDir}`);
    }
    
    const routesWithoutMethods: string[] = [];
    let totalRoutes = 0;
    
    function scan(dir: string) {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) scan(p);
        if (e.isFile() && e.name === "route.ts") {
          totalRoutes++;
          const content = readFileSync(p, "utf-8");
          
          const hasMethod = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/.test(content);
          if (!hasMethod) {
            routesWithoutMethods.push(p.replace(apiDir, "").replace(/\\/g, "/"));
          }
        }
      }
    }
    
    scan(apiDir);
    
    expect(
      routesWithoutMethods,
      `${routesWithoutMethods.length}/${totalRoutes} routes have NO HTTP method exports:\n${routesWithoutMethods.slice(0, 20).join("\n")}${routesWithoutMethods.length > 20 ? `\n... and ${routesWithoutMethods.length - 20} more` : ""}`,
    ).toHaveLength(0);
  });

  it("ALL POST routes use runtime.runCommand (no bypass)", () => {
    const apiDir = config.generatedRoutesDir;
    if (!existsSync(apiDir)) {
      throw new Error(`API directory not found: ${apiDir}`);
    }
    
    const bypass: { path: string; uses: string[] }[] = [];
    const compliant: string[] = [];
    
    function scan(dir: string) {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) scan(p);
        if (e.isFile() && e.name === "route.ts") {
          const content = readFileSync(p, "utf-8");
          
          if (/export\s+async\s+function\s+POST/.test(content)) {
            if (content.includes("runCommand")) {
              compliant.push(p.replace(apiDir, ""));
            } else {
              const uses: string[] = [];
              if (content.includes("prisma.")) uses.push("prisma");
              if (content.includes("supabase.")) uses.push("supabase");
              if (content.includes("fetch(")) uses.push("fetch");
              if (content.includes("database.")) uses.push("database");
              bypass.push({
                path: p.replace(apiDir, "").replace(/\\/g, "/"),
                uses: uses.length ? uses : ["unknown"],
              });
            }
          }
        }
      }
    }
    
    scan(apiDir);
    
    expect(
      bypass,
      `SECURITY: ${bypass.length} POST routes BYPASS runtime.runCommand (guards/policies NOT enforced):\n${bypass.map((b) => `${b.path} (uses: ${b.uses.join(", ")})`).join("\n")}\n\nCompliant routes: ${compliant.length}`,
    ).toHaveLength(0);
  });

  it("Routes strip client identity fields (no trust)", () => {
    const apiDir = config.generatedRoutesDir;
    if (!existsSync(apiDir)) {
      throw new Error(`API directory not found: ${apiDir}`);
    }
    
    const dangerousPatterns = [
      { pattern: /body\.id/, field: "body.id" },
      { pattern: /body\.userId/, field: "body.userId" },
      { pattern: /body\.tenantId/, field: "body.tenantId" },
      { pattern: /body\.orgId/, field: "body.orgId" },
      { pattern: /req\.body\.id/, field: "req.body.id" },
    ];
    
    const violations: { path: string; fields: string[] }[] = [];
    
    function scan(dir: string) {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) scan(p);
        if (e.isFile() && e.name === "route.ts") {
          const content = readFileSync(p, "utf-8");
          const foundFields: string[] = [];
          
          for (const { pattern, field } of dangerousPatterns) {
            if (pattern.test(content)) {
              foundFields.push(field);
            }
          }
          
          if (foundFields.length > 0) {
            violations.push({
              path: p.replace(apiDir, "").replace(/\\/g, "/"),
              fields: foundFields,
            });
          }
        }
      }
    }
    
    scan(apiDir);
    
    expect(
      violations,
      `Routes trusting client identity fields (security risk):\n${violations.map((v) => `${v.path}: ${v.fields.join(", ")}`).join("\n")}`,
    ).toHaveLength(0);
  });
});

// ============================================================================
// 5. GUARD EVALUATION
// ============================================================================

describe("5. Guard Evaluation", () => {
  it("Commands have guards for input validation", async () => {
    const manifests = getAllManifests();
    const withoutGuards: { file: string; entity: string; command: string }[] = [];
    const withGuards: { file: string; entity: string; command: string; count: number }[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      for (const cmd of ir.commands) {
        if (!cmd.entity) continue;
        
        if (cmd.guards.length === 0) {
          withoutGuards.push({ file, entity: cmd.entity, command: cmd.name });
        } else {
          withGuards.push({ file, entity: cmd.entity, command: cmd.name, count: cmd.guards.length });
        }
      }
    }
    
    expect(
      withoutGuards,
      `Commands WITHOUT guards (accept any input):\n${withoutGuards.map((w) => `${w.file}: ${w.entity}.${w.command}`).join("\n")}\n\nNote: ${withGuards.length} commands have guards`,
    ).toHaveLength(0);
  });

  it("Guard ordering halts on first falsey", async () => {
    // Valid Manifest syntax: mutate uses property name only (no self.)
    const testSource = `
entity TestEntity {
  property required id: string
  property status: string = ""
  
  command testCommand() {
    guard self.status != "blocked"
    guard self.status == "active"
    mutate status = "processed"
  }
}

store TestEntity in memory
    `;
    
    const ir = await compileOrThrow(testSource, "Guard ordering test");
    
    const engine = new RuntimeEngine(ir, {}, createDeterministicOptions());
    await engine.createInstance("TestEntity", { id: "test-1", status: "blocked" } as EntityInstance);
    
    const result = await engine.runCommand("testCommand", {}, { entityName: "TestEntity", instanceId: "test-1" });
    
    expect(result.success).toBe(false);
    expect(result.guardFailure).toBeDefined();
    // Runtime uses 1-based guard indexing (confirmed by conformance fixture 11-guard-ordering-diagnostics)
    expect(result.guardFailure?.index).toBe(1);
  });
});

// ============================================================================
// 6. CONSTRAINT VALIDATION
// ============================================================================

describe("6. Constraint Configuration", () => {
  it("ALL constraints have valid severity levels", async () => {
    const manifests = getAllManifests();
    const validSeverities = new Set(["ok", "warn", "block"]);
    const invalid: { file: string; entity: string; constraint: string; severity: unknown }[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      for (const entity of ir.entities) {
        for (const c of entity.constraints) {
          const sev = (c as IRConstraint).severity ?? "block";
          
          if (!validSeverities.has(sev)) {
            invalid.push({
              file,
              entity: entity.name,
              constraint: c.name,
              severity: (c as IRConstraint).severity,
            });
          }
        }
      }
    }
    
    expect(
      invalid,
      `Invalid constraint severities:\n${invalid.map((i) => `${i.file}: ${i.entity}.${i.constraint} severity=${String(i.severity)}`).join("\n")}\n\nValid: ok, warn, block`,
    ).toHaveLength(0);
  });
});

// ============================================================================
// 7. RUNTIME CONTEXT
// ============================================================================

describe("7. Runtime Context", () => {
  it("self/this identifiers work correctly", async () => {
    // Valid Manifest syntax: mutate uses property name only (no self.)
    const testSource = `
entity SelfTest {
  property required id: string
  property name: string = ""
  property selfWorks: boolean = false
  
  command testSelf() {
    guard self.name != ""
    mutate selfWorks = true
  }
}

store SelfTest in memory
    `;
    
    const ir = await compileOrThrow(testSource, "self/this test");
    
    const engine = new RuntimeEngine(ir, {}, createDeterministicOptions());
    await engine.createInstance("SelfTest", { id: "self-1", name: "TestName", selfWorks: false } as EntityInstance);
    
    const result = await engine.runCommand("testSelf", {}, { entityName: "SelfTest", instanceId: "self-1" });
    
    expect(result.success).toBe(true);
    
    const instance = await engine.getInstance("SelfTest", "self-1");
    expect(instance?.selfWorks).toBe(true);
  });

  it("now() builtin returns deterministic value when configured", async () => {
    // Valid Manifest syntax: mutate uses property name only (no self.)
    const testSource = `
entity TimeTest {
  property required id: string
  property timestamp: number = 0
  
  command recordTime() {
    mutate timestamp = now()
  }
}

store TimeTest in memory
    `;
    
    const ir = await compileOrThrow(testSource, "now() test");
    
    const engine = new RuntimeEngine(ir, {}, createDeterministicOptions());
    await engine.createInstance("TimeTest", { id: "time-1", timestamp: 0 } as EntityInstance);
    
    await engine.runCommand("recordTime", {}, { entityName: "TimeTest", instanceId: "time-1" });
    
    const instance = await engine.getInstance("TimeTest", "time-1");
    expect(instance?.timestamp).toBe(1000000000000);
  });
});

// ============================================================================
// 8. RELATIONSHIPS
// ============================================================================

describe("8. Relationship Configuration", () => {
  it("ALL relationships have valid kinds", async () => {
    const manifests = getAllManifests();
    const validKinds = new Set(["hasMany", "hasOne", "belongsTo", "ref"]);
    const invalid: { file: string; entity: string; relationship: string; kind: string }[] = [];
    
    for (const file of manifests) {
      const { ir } = await compileManifest(file);
      if (!ir) continue;
      
      for (const entity of ir.entities) {
        for (const rel of entity.relationships) {
          if (!validKinds.has(rel.kind)) {
            invalid.push({ file, entity: entity.name, relationship: rel.name, kind: rel.kind });
          }
        }
      }
    }
    
    expect(
      invalid,
      `Invalid relationship kinds:\n${invalid.map((i) => `${i.file}: ${i.entity}.${i.relationship} kind="${i.kind}"`).join("\n")}\n\nValid: hasMany, hasOne, belongsTo, ref`,
    ).toHaveLength(0);
  });
});

// ============================================================================
// 9. DETERMINISM
// ============================================================================

describe("9. Determinism", () => {
  it("Identical source produces identical IR", async () => {
    const manifests = getAllManifests().slice(0, 5);
    const nonDeterministic: string[] = [];
    
    function normalize(ir: IR): IR {
      const n = JSON.parse(JSON.stringify(ir));
      if (n.provenance) {
        n.provenance.compiledAt = "normalized";
        n.provenance.contentHash = "normalized";
        n.provenance.irHash = "normalized";
      }
      return n;
    }
    
    for (const file of manifests) {
      const source = loadManifest(file);
      const result1 = await compileToIR(source);
      const result2 = await compileToIR(source);
      
      if (result1.ir && result2.ir) {
        const norm1 = JSON.stringify(normalize(result1.ir));
        const norm2 = JSON.stringify(normalize(result2.ir));
        
        if (norm1 !== norm2) {
          nonDeterministic.push(file);
        }
      }
    }
    
    expect(
      nonDeterministic,
      `Non-deterministic IR compilation:\n${nonDeterministic.join("\n")}`,
    ).toHaveLength(0);
  });
});
