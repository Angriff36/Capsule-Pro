import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ENTITY_DOMAIN_MAP } from "./entity-domain-map.js";

export const DISPATCHER_ROUTE_PATH = "/api/manifest/:entity/commands/:command";

export interface RouteConformanceFinding {
  code: string;
  evidence?: string;
  file: string;
  line?: number;
  message: string;
  severity: "error" | "warning" | "info";
  suggestion?: string;
}

export interface RouteConformanceScanResult {
  findings: RouteConformanceFinding[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    scannedFiles: number;
  };
}

interface ManifestRoute {
  id?: string;
  method?: string;
  path: string;
  source?: {
    kind?: string;
    entity?: string;
    command?: string;
  };
}

const ROUTE_FILE_PATTERN = /route\.ts$/;

/** Relative to `apps/api/app/api/` — must match apps/api custom allowlist. */
const CUSTOM_COMMAND_ROUTE_ALLOWLIST = new Set([
  "communications/email-templates/commands/create/route.ts",
  "events/profitability/commands/recalculate/route.ts",
  "procurement/purchase-orders/commands/update-status/route.ts",
  "procurement/purchase-orders/commands/receive/route.ts",
  "staff/shifts/commands/create-validated/route.ts",
  "staff/shifts/commands/update-validated/route.ts",
]);

const INFRA_PREFIXES = [
  "/api/webhooks/",
  "/api/integrations/webhooks/",
  "/api/auth/",
  "/api/cron/",
  "/api/health",
  "/api/sentry-fixer/",
];

function scanDirectory(
  dir: string,
  pattern: RegExp,
  excludeDirs = ["node_modules", ".next", "dist", "build"]
): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    let entries: string[];
    try {
      entries = readdirSync(currentDir);
    } catch {
      return;
    }

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
        // skip inaccessible paths
      }
    }
  }

  walk(dir);
  return files;
}

function routePathFromFile(apiDir: string, file: string): string {
  const relativePath = relative(apiDir, file);
  return `/api/${relativePath
    .replace(/\\/g, "/")
    .replace(/\/route\.ts$/, "")
    .replace(/\[([^\]]+)\]/g, ":$1")}`;
}

function routePathToFile(apiDir: string, routePath: string): string {
  return join(
    apiDir,
    routePath
      .replace("/api/", "")
      .replace(/:([^/]+)/g, "[$1]")
      .replace(/\//g, "/"),
    "route.ts"
  );
}

function routeFileExists(apiDir: string, routePath: string): boolean {
  try {
    statSync(routePathToFile(apiDir, routePath));
    return true;
  } catch {
    return false;
  }
}

function isInfraRoutePath(routePath: string): boolean {
  return INFRA_PREFIXES.some(
    (prefix) =>
      routePath === prefix.replace(/\/$/, "") || routePath.startsWith(prefix)
  );
}

function isConcreteCommandRouteFile(relativeApiPath: string): boolean {
  const normalized = relativeApiPath.replace(/\\/g, "/");
  const match = normalized.match(/\/commands\/([^/]+)\/route\.ts$/);
  if (!match) {
    return false;
  }
  const segment = match[1];
  return segment !== "[command]" && segment !== "[...command]";
}

function loadCommandRegistry(projectRoot: string): Set<string> {
  const commandsPath = join(projectRoot, "manifest/ir/kitchen.commands.json");
  const raw = JSON.parse(readFileSync(commandsPath, "utf-8")) as Array<{
    entity: string;
    command: string;
  }>;
  return new Set(raw.map((entry) => `${entry.entity}.${entry.command}`));
}

function domainReadCandidatePaths(route: ManifestRoute): string[] {
  const entity = route.source?.entity;
  const domain = entity ? ENTITY_DOMAIN_MAP[entity] : undefined;
  if (!domain) {
    return [];
  }

  const legacyTail = route.path.replace(/^\/api\/[^/]+/, "");
  if (legacyTail === "/list" || route.id?.endsWith(".get.list")) {
    return [`/api/${domain}/list`, `/api/${domain}`];
  }
  if (legacyTail === "/:id" || route.id?.endsWith(".get.detail")) {
    return [`/api/${domain}/:id`];
  }

  return [`/api/${domain}${legacyTail}`];
}

function readRouteImplemented(apiDir: string, route: ManifestRoute): boolean {
  const candidates = [route.path, ...domainReadCandidatePaths(route)];
  return candidates.some((path) => routeFileExists(apiDir, path));
}

export function scanRouteConformance(
  projectRoot = process.cwd()
): RouteConformanceScanResult {
  const findings: RouteConformanceFinding[] = [];
  let scannedFiles = 0;

  const manifestPath = join(
    projectRoot,
    "manifest/runtime/routes.manifest.json"
  );
  const apiDir = join(projectRoot, "apps/api/app/api");
  const dispatcherFile = join(
    apiDir,
    "manifest/[entity]/commands/[command]/route.ts"
  );

  if (!existsSync(manifestPath)) {
    return {
      findings: [
        {
          code: "SCAN_ERROR",
          severity: "error",
          message: `Manifest not found: ${relative(projectRoot, manifestPath)}`,
          file: "route-conformance-scan.ts",
        },
      ],
      summary: {
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        scannedFiles: 0,
      },
    };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
    routes: ManifestRoute[];
  };
  const manifestRoutes = new Set(manifest.routes.map((route) => route.path));
  manifestRoutes.add(DISPATCHER_ROUTE_PATH);

  let commandRegistry: Set<string>;
  try {
    commandRegistry = loadCommandRegistry(projectRoot);
  } catch (error) {
    return {
      findings: [
        {
          code: "SCAN_ERROR",
          severity: "error",
          message: `Failed to load kitchen.commands.json: ${error instanceof Error ? error.message : String(error)}`,
          file: "route-conformance-scan.ts",
        },
      ],
      summary: {
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        scannedFiles: 0,
      },
    };
  }

  const dispatcherExists = existsSync(dispatcherFile);
  if (!dispatcherExists) {
    findings.push({
      code: "DISPATCHER_MISSING",
      severity: "error",
      message: "Manifest command dispatcher route is missing",
      file: relative(projectRoot, dispatcherFile),
      evidence: DISPATCHER_ROUTE_PATH,
      suggestion:
        "Add apps/api/app/api/manifest/[entity]/commands/[command]/route.ts",
    });
  }

  const routeFiles = scanDirectory(apiDir, ROUTE_FILE_PATTERN);
  scannedFiles = routeFiles.length;

  for (const file of routeFiles) {
    const relativeApiPath = relative(apiDir, file);
    const routePath = routePathFromFile(apiDir, file);

    if (
      isConcreteCommandRouteFile(relativeApiPath) &&
      !CUSTOM_COMMAND_ROUTE_ALLOWLIST.has(relativeApiPath.replace(/\\/g, "/"))
    ) {
      findings.push({
        code: "CONCRETE_COMMAND_ROUTE_NOT_DISPATCHED",
        severity: "error",
        message:
          "Per-command route file must not exist; commands use the manifest dispatcher",
        file: relative(projectRoot, file),
        evidence: routePath,
        suggestion:
          "Delete this file. Commands execute via POST /api/manifest/{entity}/commands/{command}",
      });
      continue;
    }

    if (
      routePath === DISPATCHER_ROUTE_PATH ||
      isInfraRoutePath(routePath) ||
      manifestRoutes.has(routePath)
    ) {
      continue;
    }

    findings.push({
      code: "ROUTE_NOT_IN_MANIFEST",
      severity: "warning",
      message: "API route not found in routes.manifest.json",
      file: relative(projectRoot, file),
      evidence: routePath,
      suggestion:
        "Add route to manifest, register infra allowlist, or remove if obsolete",
    });
  }

  for (const route of manifest.routes) {
    const sourceKind = route.source?.kind;

    if (sourceKind === "command" && route.method === "POST") {
      const entity = route.source?.entity;
      const command = route.source?.command;
      const commandKey = `${entity}.${command}`;

      if (!commandRegistry.has(commandKey)) {
        findings.push({
          code: "COMMAND_NOT_IN_REGISTRY",
          severity: "error",
          message:
            "Manifest command is not registered in kitchen.commands.json",
          file: route.path,
          evidence: commandKey,
          suggestion: "Run manifest compile or add the command to the IR",
        });
      } else if (!dispatcherExists) {
        findings.push({
          code: "COMMAND_WITHOUT_DISPATCHER",
          severity: "error",
          message: "Command is registered but dispatcher route is missing",
          file: route.path,
          evidence: commandKey,
          suggestion: "Restore manifest/[entity]/commands/[command]/route.ts",
        });
      }
      continue;
    }

    if (sourceKind === "entity-read" || route.method === "GET") {
      if (!readRouteImplemented(apiDir, route)) {
        findings.push({
          code: "READ_ROUTE_NOT_IMPLEMENTED",
          severity: "warning",
          message:
            "Manifest read route has no matching route.ts (legacy or domain path)",
          file: route.path,
          evidence: [route.path, ...domainReadCandidatePaths(route)].join(", "),
          suggestion:
            "Implement GET handler or remove stale entity-read entry from routes.manifest.json",
        });
      }
      continue;
    }

    if (!routeFileExists(apiDir, route.path)) {
      findings.push({
        code: "ROUTE_NOT_IMPLEMENTED",
        severity: "error",
        message: "Route in manifest but no implementation found",
        file: route.path,
        evidence: `Expected: ${relative(projectRoot, routePathToFile(apiDir, route.path))}`,
        suggestion: "Implement the route handler or remove from manifest",
      });
    }
  }

  return {
    findings,
    summary: {
      errorCount: findings.filter((finding) => finding.severity === "error")
        .length,
      warningCount: findings.filter((finding) => finding.severity === "warning")
        .length,
      infoCount: findings.filter((finding) => finding.severity === "info")
        .length,
      scannedFiles,
    },
  };
}
