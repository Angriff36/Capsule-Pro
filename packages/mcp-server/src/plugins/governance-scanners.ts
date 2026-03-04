/**
 * Governance scanner tools.
 *
 * Tools:
 * - `governance_scanBypass`: Scan for code bypassing manifest commands
 * - `governance_scanRoutes`: Scan for route conformance
 * - `governance_scanDocsDrift`: Scan for documentation drift from IR
 *
 * @packageDocumentation
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { z } from "zod";
import type { McpPlugin, PluginContext } from "../types.js";

const projectRoot = process.env.MCP_PROJECT_ROOT || process.cwd();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  file: string;
  line?: number;
  evidence?: string;
  suggestion?: string;
}

interface ScanResult {
  findings: Finding[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    scannedFiles: number;
  };
}

// Regex patterns defined at top level for performance
const DIRECT_DB_ACCESS_PATTERN =
  /prisma\.(user|prepTask|event|recipe)\.(create|update|delete|findMany)\(/i;
const DIRECT_UPDATE_PATTERN = /\.update\(\s*\{\s*data\s*:/i;
const DIRECT_DELETE_PATTERN = /\.delete\(\s*\{\s*where\s*:/i;
const HARDCODED_TENANT_PATTERN = /tenantId\s*[:=]\s*["']test-tenant["']/i;
const HARDCODED_USER_PATTERN = /userId\s*[:=]\s*["']test-user["']/i;
const AUTH_DISABLED_PATTERN = /auth\s*[:=]\s*(false|0|null)/i;
const ROUTE_FILE_PATTERN = /route\.ts$/;
const MANIFEST_FILE_PATTERN = /\.manifest$/;
const IR_FILE_PATTERN = /\.ir\.json$/;
const DOC_FILE_PATTERN = /\.md$/;

// ---------------------------------------------------------------------------
// File scanning utilities
// ---------------------------------------------------------------------------

function scanDirectory(
  dir: string,
  pattern: RegExp,
  excludeDirs: string[] = ["node_modules", ".next", "dist", "build"]
): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        try {
          const fileStat = statSync(fullPath);
          if (fileStat.isDirectory()) {
            if (!excludeDirs.includes(entry)) {
              walk(fullPath);
            }
          } else if (fileStat.isFile() && pattern.test(entry)) {
            files.push(fullPath);
          }
        } catch {
          // Skip files we can't access
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walk(dir);
  return files;
}

interface PatternConfig {
  pattern: RegExp;
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
  suggestion?: string;
}

function findPatternInFile(
  filePath: string,
  patterns: PatternConfig[]
): Finding[] {
  const findings: Finding[] = [];

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      for (const { pattern, code, message, severity, suggestion } of patterns) {
        if (pattern.test(line)) {
          findings.push({
            code,
            severity,
            message,
            file: relative(projectRoot, filePath),
            line: index + 1,
            evidence: line.trim(),
            suggestion,
          });
        }
      }
    });
  } catch {
    // Skip files we can't read
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Bypass scanner
// ---------------------------------------------------------------------------

function scanForBypass(scope: "api" | "app" | "all"): ScanResult {
  const findings: Finding[] = [];
  let scannedFiles = 0;

  const bypassPatterns: PatternConfig[] = [
    {
      pattern: DIRECT_DB_ACCESS_PATTERN,
      code: "DIRECT_DB_ACCESS",
      message: "Direct database access bypasses manifest runtime",
      severity: "error",
      suggestion: "Use runtime.runCommand() instead of direct Prisma calls",
    },
    {
      pattern: DIRECT_UPDATE_PATTERN,
      code: "DIRECT_UPDATE",
      message: "Direct entity update without command validation",
      severity: "error",
      suggestion: "Route updates through manifest commands",
    },
    {
      pattern: DIRECT_DELETE_PATTERN,
      code: "DIRECT_DELETE",
      message: "Direct entity deletion without command authorization",
      severity: "error",
      suggestion: "Use delete command with proper authorization",
    },
    {
      pattern: HARDCODED_TENANT_PATTERN,
      code: "HARDCODED_TENANT",
      message: "Hardcoded tenant ID found",
      severity: "warning",
      suggestion: "Use identity.tenantId from context",
    },
    {
      pattern: HARDCODED_USER_PATTERN,
      code: "HARDCODED_USER",
      message: "Hardcoded user ID found",
      severity: "warning",
      suggestion: "Use identity.userId from context",
    },
    {
      pattern: AUTH_DISABLED_PATTERN,
      code: "AUTH_DISABLED",
      message: "Authentication disabled",
      severity: "warning",
      suggestion: "Ensure auth is enabled in production",
    },
  ];

  const dirsToScan: string[] = [];
  if (scope === "api" || scope === "all") {
    dirsToScan.push(join(projectRoot, "apps/api"));
  }
  if (scope === "app" || scope === "all") {
    dirsToScan.push(join(projectRoot, "apps/web"));
  }

  for (const dir of dirsToScan) {
    const files = scanDirectory(dir, /\.(ts|tsx|js|jsx)$/);
    scannedFiles += files.length;

    for (const file of files) {
      findings.push(...findPatternInFile(file, bypassPatterns));
    }
  }

  const summary = {
    errorCount: findings.filter((f) => f.severity === "error").length,
    warningCount: findings.filter((f) => f.severity === "warning").length,
    infoCount: findings.filter((f) => f.severity === "info").length,
    scannedFiles,
  };

  return { findings, summary };
}

// ---------------------------------------------------------------------------
// Route conformance scanner
// ---------------------------------------------------------------------------

function scanRouteConformance(): ScanResult {
  const findings: Finding[] = [];
  let scannedFiles = 0;

  try {
    const manifestPath = join(
      projectRoot,
      "packages/manifest-ir/dist/routes.manifest.json"
    );
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const manifestRoutes = new Set(
      manifest.routes.map((r: { path: string }) => r.path)
    );

    const apiDir = join(projectRoot, "apps/api/app/api");
    const routeFiles = scanDirectory(apiDir, ROUTE_FILE_PATTERN);
    scannedFiles = routeFiles.length;

    for (const file of routeFiles) {
      const relativePath = relative(join(projectRoot, "apps/api/app"), file);

      const routePath = `/api/${relativePath
        .replace(/\\/g, "/")
        .replace(/\/route\.ts$/, "")
        .replace(/\[([^\]]+)\]/g, ":$1")}`;

      if (!manifestRoutes.has(routePath)) {
        findings.push({
          code: "ROUTE_NOT_IN_MANIFEST",
          severity: "warning",
          message: "API route not found in routes.manifest.json",
          file: relative(projectRoot, file),
          evidence: routePath,
          suggestion:
            "Add route to manifest or remove if obsolete. Regenerate routes with manifest compile.",
        });
      }
    }

    for (const route of manifest.routes) {
      const filePath = join(
        apiDir,
        route.path
          .replace("/api/", "")
          .replace(/:([^/]+)/g, "[$1]")
          .replace(/\//g, "/"),
        "route.ts"
      );

      try {
        statSync(filePath);
      } catch {
        findings.push({
          code: "ROUTE_NOT_IMPLEMENTED",
          severity: "error",
          message: "Route in manifest but no implementation found",
          file: route.path,
          evidence: `Expected: ${relative(projectRoot, filePath)}`,
          suggestion: "Implement the route handler or remove from manifest",
        });
      }
    }
  } catch (error) {
    findings.push({
      code: "SCAN_ERROR",
      severity: "error",
      message: `Failed to scan routes: ${error instanceof Error ? error.message : String(error)}`,
      file: "governance-scanners.ts",
    });
  }

  const summary = {
    errorCount: findings.filter((f) => f.severity === "error").length,
    warningCount: findings.filter((f) => f.severity === "warning").length,
    infoCount: findings.filter((f) => f.severity === "info").length,
    scannedFiles,
  };

  return { findings, summary };
}

// ---------------------------------------------------------------------------
// Documentation drift scanner
// ---------------------------------------------------------------------------

function scanDocumentationDrift(): ScanResult {
  const findings: Finding[] = [];
  let scannedFiles = 0;

  try {
    const specsDir = join(projectRoot, "specs");
    const manifestFiles = scanDirectory(specsDir, MANIFEST_FILE_PATTERN);
    scannedFiles += manifestFiles.length;

    for (const manifestFile of manifestFiles) {
      const relativePath = relative(specsDir, manifestFile);
      const domain = relativePath.split(/[/\\]/)[0];
      const irPath = join(
        projectRoot,
        "packages/manifest-ir/ir",
        domain,
        `${domain}.ir.json`
      );

      try {
        const manifestStat = statSync(manifestFile);
        const irStat = statSync(irPath);

        if (manifestStat.mtime > irStat.mtime) {
          findings.push({
            code: "IR_STALE",
            severity: "warning",
            message: "IR is older than manifest source",
            file: relative(projectRoot, manifestFile),
            evidence: `Manifest: ${manifestStat.mtime.toISOString()}, IR: ${irStat.mtime.toISOString()}`,
            suggestion: "Regenerate IR with manifest compile",
          });
        }
      } catch {
        findings.push({
          code: "IR_MISSING",
          severity: "error",
          message: "No IR found for manifest file",
          file: relative(projectRoot, manifestFile),
          suggestion: "Run manifest compile to generate IR",
        });
      }
    }

    const irPath = join(projectRoot, "packages/manifest-ir/ir");
    const irFiles = scanDirectory(irPath, IR_FILE_PATTERN);
    scannedFiles += irFiles.length;

    for (const irFile of irFiles) {
      try {
        const irContent = JSON.parse(readFileSync(irFile, "utf-8"));
        const entities = irContent.entities || [];

        for (const entity of entities) {
          const docsDir = join(projectRoot, "docs");
          const expectedDocFile = join(
            docsDir,
            "entities",
            `${entity.name}.md`
          );

          try {
            statSync(expectedDocFile);
          } catch {
            findings.push({
              code: "DOC_MISSING",
              severity: "info",
              message: `No documentation found for entity ${entity.name}`,
              file: relative(projectRoot, irFile),
              suggestion: `Create documentation at docs/entities/${entity.name}.md`,
            });
          }
        }
      } catch {
        // Skip IR files we can't parse
      }
    }
  } catch (error) {
    findings.push({
      code: "SCAN_ERROR",
      severity: "error",
      message: `Failed to scan documentation: ${error instanceof Error ? error.message : String(error)}`,
      file: "governance-scanners.ts",
    });
  }

  const summary = {
    errorCount: findings.filter((f) => f.severity === "error").length,
    warningCount: findings.filter((f) => f.severity === "warning").length,
    infoCount: findings.filter((f) => f.severity === "info").length,
    scannedFiles,
  };

  return { findings, summary };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const governanceScannersPlugin: McpPlugin = {
  name: "governance-scanners",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

    // ── governance_scanBypass ───────────────────────────────────────────
    server.registerTool(
      "governance_scanBypass",
      {
        title: "Scan for Bypass Patterns",
        description:
          "Scan codebase for patterns that bypass manifest commands, " +
          "such as direct database access, hardcoded credentials, or disabled auth.",
        inputSchema: z.object({
          scope: z
            .enum(["api", "app", "all"])
            .optional()
            .default("all")
            .describe("Scope to scan"),
        }),
      },
      async (args: { scope?: "api" | "app" | "all" }) => {
        const { scope = "all" } = args;

        try {
          const result = scanForBypass(scope);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error scanning for bypass patterns: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── governance.scanRoutes ───────────────────────────────────────────
    server.registerTool(
      "governance_scanRoutes",
      {
        title: "Scan Route Conformance",
        description:
          "Scan API routes to verify they exist in routes.manifest.json " +
          "and check for routes in manifest without implementation.",
        inputSchema: z.object({}),
      },
      async () => {
        try {
          const result = scanRouteConformance();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error scanning route conformance: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── governance.scanDocsDrift ───────────────────────────────────────
    server.registerTool(
      "governance_scanDocsDrift",
      {
        title: "Scan Documentation Drift",
        description:
          "Scan for documentation drift by checking if IR is stale, " +
          "missing, or if entities lack documentation.",
        inputSchema: z.object({}),
      },
      async () => {
        try {
          const result = scanDocumentationDrift();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error scanning documentation drift: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
};
