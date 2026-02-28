import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { glob } from "glob";
import ora from "ora";
import * as ts from "typescript";

type Severity = "error" | "warning";

export interface RouteAuditFinding {
  file: string;
  severity: Severity;
  code: string;
  message: string;
  suggestion?: string;
}

export interface RouteAuditFileResult {
  methods: string[];
  findings: RouteAuditFinding[];
}

export interface ExemptionEntry {
  path: string;
  methods: string[];
  reason: string;
  category: string;
}

export interface CommandManifestEntry {
  entity: string;
  command: string;
  commandId: string;
}

export interface AuditRoutesOptions {
  root?: string;
  format?: "text" | "json";
  strict?: boolean;
  tenantField?: string;
  deletedField?: string;
  locationField?: string;
  commandsManifest?: string;
  exemptions?: string;
}

const READ_METHODS = new Set(["GET"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DIRECT_QUERY_METHODS = new Set([
  "findMany",
  "findFirst",
  "findUnique",
  "groupBy",
  "aggregate",
]);

const ROUTE_PATTERNS = [
  "app/api/**/route.ts",
  "app/api/**/route.js",
  "src/app/api/**/route.ts",
  "src/app/api/**/route.js",
  "apps/*/app/api/**/route.ts",
  "apps/*/app/api/**/route.js",
];

const DIRECT_QUERY_RE =
  /\b(findMany|findFirst|findUnique|groupBy|aggregate)\s*\(/;
const RUNTIME_COMMAND_RE = /\brunCommand\s*\(/;
const USER_CONTEXT_RE = /\buser\s*:\s*\{/;

function detectExportedMethods(content: string): string[] {
  const methods = new Set<string>();
  const re =
    /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;
  let match = re.exec(content);
  while (match) {
    methods.add(match[1]);
    match = re.exec(content);
  }
  return Array.from(methods);
}

function escapeRegexToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasFieldToken(content: string, fieldName: string): boolean {
  const fieldRe = new RegExp(`\\b${escapeRegexToken(fieldName)}\\b`);
  return fieldRe.test(content);
}

function propertyNameMatches(name: ts.PropertyName, expected: string): boolean {
  if (ts.isIdentifier(name)) {
    return name.text === expected;
  }
  if (ts.isStringLiteral(name)) {
    return name.text === expected;
  }
  if (ts.isNumericLiteral(name)) {
    return name.text === expected;
  }
  if (ts.isComputedPropertyName(name) && ts.isStringLiteral(name.expression)) {
    return name.expression.text === expected;
  }
  return false;
}

function hasFieldInObjectLiteral(
  objectLiteral: ts.ObjectLiteralExpression,
  fieldName: string
): boolean {
  for (const prop of objectLiteral.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      propertyNameMatches(prop.name, fieldName)
    ) {
      return true;
    }
    if (
      ts.isShorthandPropertyAssignment(prop) &&
      prop.name.text === fieldName
    ) {
      return true;
    }
  }
  return false;
}

function isDirectQueryCall(node: ts.CallExpression): boolean {
  if (ts.isPropertyAccessExpression(node.expression)) {
    return DIRECT_QUERY_METHODS.has(node.expression.name.text);
  }
  if (
    ts.isElementAccessExpression(node.expression) &&
    ts.isStringLiteral(node.expression.argumentExpression)
  ) {
    return DIRECT_QUERY_METHODS.has(node.expression.argumentExpression.text);
  }
  return false;
}

function hasLocationFilterInDirectQueryWhere(
  content: string,
  locationField: string
): boolean {
  const sourceFile = ts.createSourceFile(
    "route.ts",
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  let found = false;

  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }

    if (ts.isCallExpression(node) && isDirectQueryCall(node)) {
      const firstArg = node.arguments[0];
      if (firstArg && ts.isObjectLiteralExpression(firstArg)) {
        const whereProperty = firstArg.properties.find(
          (prop): prop is ts.PropertyAssignment =>
            ts.isPropertyAssignment(prop) &&
            propertyNameMatches(prop.name, "where")
        );

        if (
          whereProperty &&
          ts.isObjectLiteralExpression(whereProperty.initializer) &&
          hasFieldInObjectLiteral(whereProperty.initializer, locationField)
        ) {
          found = true;
          return;
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

/**
 * Normalize a file path to use forward slashes and extract the route-relative
 * portion (e.g. "app/api/kitchen/prep-tasks/commands/create/route.ts").
 */
function normalizeRoutePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/**
 * Check if a normalized route path is inside the commands namespace.
 */
function isInCommandsNamespace(normalizedPath: string): boolean {
  return normalizedPath.includes("/commands/");
}

/**
 * Check if a route file path matches an exemption entry.
 * Matches if the normalized path ends with the exemption path.
 */
function isExempted(
  normalizedPath: string,
  method: string,
  exemptions: ExemptionEntry[]
): boolean {
  for (const exemption of exemptions) {
    const exemptionNormalized = exemption.path.replace(/\\/g, "/");
    if (
      normalizedPath.endsWith(exemptionNormalized) &&
      exemption.methods.includes(method)
    ) {
      return true;
    }
  }
  return false;
}

export interface OwnershipAuditContext {
  commandManifestPaths: Set<string>;
  exemptions: ExemptionEntry[];
}

export function auditRouteFileContent(
  content: string,
  file: string,
  options: Required<
    Pick<AuditRoutesOptions, "tenantField" | "deletedField" | "locationField">
  >,
  ownershipContext?: OwnershipAuditContext
): RouteAuditFileResult {
  const findings: RouteAuditFinding[] = [];
  const methods = detectExportedMethods(content);

  if (methods.length === 0) {
    return { methods, findings };
  }

  const hasRunCommand = RUNTIME_COMMAND_RE.test(content);
  const hasDirectQuery = DIRECT_QUERY_RE.test(content);
  const locationReferenced = hasFieldToken(content, options.locationField);
  const hasLocationFilter = hasLocationFilterInDirectQueryWhere(
    content,
    options.locationField
  );

  for (const method of methods) {
    if (WRITE_METHODS.has(method) && !hasRunCommand) {
      findings.push({
        file,
        severity: "error",
        code: "WRITE_ROUTE_BYPASSES_RUNTIME",
        message: `${method} route appears to bypass runtime command execution (no runCommand call found).`,
        suggestion:
          "Write routes should execute through RuntimeEngine.runCommand to enforce policy/guard/constraint semantics.",
      });
    }

    if (
      WRITE_METHODS.has(method) &&
      hasRunCommand &&
      !USER_CONTEXT_RE.test(content)
    ) {
      findings.push({
        file,
        severity: "warning",
        code: "WRITE_ROUTE_USER_CONTEXT_NOT_VISIBLE",
        message: `${method} route calls runCommand but no explicit user context object was detected.`,
        suggestion:
          "Ensure createManifestRuntime receives user context when command policies/guards reference user.* bindings.",
      });
    }

    if (READ_METHODS.has(method) && hasDirectQuery) {
      if (!hasFieldToken(content, options.tenantField)) {
        findings.push({
          file,
          severity: "warning",
          code: "READ_MISSING_TENANT_SCOPE",
          message: `GET route uses direct query but '${options.tenantField}' predicate was not detected.`,
          suggestion:
            "Add tenant scoping to read queries or move read authorization/scope to an enforced data policy boundary.",
        });
      }

      const softDeletePattern = new RegExp(
        `\\b${escapeRegexToken(options.deletedField)}\\s*:\\s*null\\b`
      );
      if (!softDeletePattern.test(content)) {
        findings.push({
          file,
          severity: "warning",
          code: "READ_MISSING_SOFT_DELETE_FILTER",
          message: `GET route uses direct query but '${options.deletedField}: null' filter was not detected.`,
          suggestion:
            "Apply a default soft-delete exclusion filter for analytics/listing correctness, unless intentionally reading deleted rows.",
        });
      }

      if (locationReferenced && !hasLocationFilter) {
        findings.push({
          file,
          severity: "warning",
          code: "READ_LOCATION_REFERENCE_WITHOUT_FILTER",
          message: `GET route references '${options.locationField}' but a matching query filter was not detected.`,
          suggestion:
            "If the endpoint is location-scoped, include the location predicate in the direct query where-clause.",
        });
      }
    }
  }

  // --- Ownership rules (require ownershipContext) ---
  if (ownershipContext) {
    const normalizedFile = normalizeRoutePath(file);
    const inCommandsNs = isInCommandsNamespace(normalizedFile);
    const hasWriteMethod = methods.some((m) => WRITE_METHODS.has(m));

    // Rule: WRITE_OUTSIDE_COMMANDS_NAMESPACE
    // Write routes outside /commands/ must be exempted or they fail.
    if (hasWriteMethod && !inCommandsNs) {
      for (const method of methods) {
        if (
          WRITE_METHODS.has(method) &&
          !isExempted(normalizedFile, method, ownershipContext.exemptions)
        ) {
          findings.push({
            file,
            severity: "warning",
            code: "WRITE_OUTSIDE_COMMANDS_NAMESPACE",
            message: `${method} route is outside the commands namespace and not in the exemption registry.`,
            suggestion:
              "Move this route to commands/<command>/route.ts or register an explicit exemption in audit-routes-exemptions.json.",
          });
        }
      }
    }

    // Rule: COMMAND_ROUTE_MISSING_RUNTIME_CALL
    // Routes inside /commands/ must call runCommand.
    if (inCommandsNs && !hasRunCommand) {
      findings.push({
        file,
        severity: "warning",
        code: "COMMAND_ROUTE_MISSING_RUNTIME_CALL",
        message:
          "Command route does not call runCommand — all command routes must execute through runtime.",
        suggestion:
          "All command routes must execute through runtime.runCommand.",
      });
    }

    // Rule: COMMAND_ROUTE_ORPHAN
    // Routes inside /commands/ must have a backing entry in commands.json.
    if (inCommandsNs && ownershipContext.commandManifestPaths.size > 0) {
      // Extract the domain-relative path from the full file path.
      // We need to match against paths like "kitchen/prep-tasks/commands/create/route.ts"
      const apiDirPatterns = [
        "/apps/api/app/api/",
        "/app/api/",
        "/src/app/api/",
      ];
      let routeRelative = "";
      for (const pattern of apiDirPatterns) {
        const idx = normalizedFile.indexOf(pattern);
        if (idx >= 0) {
          routeRelative = normalizedFile.slice(idx + pattern.length);
          break;
        }
      }

      if (
        routeRelative &&
        !ownershipContext.commandManifestPaths.has(routeRelative)
      ) {
        // Check if this orphan route is explicitly exempted
        const isOrphanExempted = methods.some((m) =>
          isExempted(normalizedFile, m, ownershipContext.exemptions)
        );
        if (!isOrphanExempted) {
          findings.push({
            file,
            severity: "warning",
            code: "COMMAND_ROUTE_ORPHAN",
            message: `Command route "${routeRelative}" has no backing entry in kitchen.commands.json.`,
            suggestion:
              "This command route has no IR backing. Delete it or add the command to your manifest.",
          });
        }
      }
    }
  }

  return { methods, findings };
}

async function discoverRouteFiles(root: string): Promise<string[]> {
  const files = await Promise.all(
    ROUTE_PATTERNS.map((pattern) =>
      glob(pattern, {
        cwd: root,
        absolute: true,
        ignore: [
          "**/node_modules/**",
          "**/.next/**",
          "**/dist/**",
          "**/build/**",
        ],
      })
    )
  );
  return Array.from(new Set(files.flat()));
}

// Entity-to-domain mapping for building expected command route paths.
// Must stay in sync with ENTITY_DOMAIN_MAP in scripts/manifest/generate.mjs.
const ENTITY_DOMAIN_MAP: Record<string, string> = {
  AlertsConfig: "kitchen/alerts-config",
  AllergenWarning: "kitchen/allergen-warnings",
  BattleBoard: "events/battle-boards",
  BudgetLineItem: "events/budget-line-items",
  CateringOrder: "events/catering-orders",
  Client: "crm/clients",
  ClientContact: "crm/client-contacts",
  ClientInteraction: "crm/client-interactions",
  ClientPreference: "crm/client-preferences",
  CommandBoard: "command-board/boards",
  CommandBoardCard: "command-board/cards",
  CommandBoardConnection: "command-board/connections",
  CommandBoardGroup: "command-board/groups",
  CommandBoardLayout: "command-board/layouts",
  Container: "kitchen/containers",
  ContractSignature: "events/contract-signatures",
  CycleCountRecord: "inventory/cycle-count/records",
  CycleCountSession: "inventory/cycle-count/sessions",
  Dish: "kitchen/dishes",
  Event: "events/event",
  EventBudget: "events/budgets",
  EventContract: "events/contracts",
  EventGuest: "events/guests",
  EventProfitability: "events/profitability",
  EventReport: "events/reports",
  EventSummary: "events/summaries",
  Ingredient: "kitchen/ingredients",
  InventoryItem: "kitchen/inventory",
  InventorySupplier: "inventory/suppliers",
  InventoryTransaction: "inventory/transactions",
  KitchenTask: "kitchen/kitchen-tasks",
  Lead: "crm/leads",
  Menu: "kitchen/menus",
  MenuDish: "kitchen/menu-dishes",
  Notification: "collaboration/notifications",
  OverrideAudit: "kitchen/override-audits",
  PrepComment: "kitchen/prep-comments",
  PrepList: "kitchen/prep-lists",
  PrepListItem: "kitchen/prep-list-items",
  PrepMethod: "kitchen/prep-methods",
  PrepTask: "kitchen/prep-tasks",
  Proposal: "crm/proposals",
  ProposalLineItem: "crm/proposal-line-items",
  PurchaseOrder: "inventory/purchase-orders",
  PurchaseOrderItem: "inventory/purchase-order-items",
  Recipe: "kitchen/recipes",
  RecipeIngredient: "kitchen/recipe-ingredients",
  RecipeVersion: "kitchen/recipe-versions",
  Schedule: "staff/schedules",
  ScheduleShift: "staff/shifts",
  Shipment: "shipments/shipment",
  ShipmentItem: "shipments/shipment-items",
  Station: "kitchen/stations",
  TimeEntry: "timecards/entries",
  TimecardEditRequest: "timecards/edit-requests",
  User: "staff/employees",
  VarianceReport: "inventory/cycle-count/variance-reports",
  WasteEntry: "kitchen/waste-entries",
  Workflow: "collaboration/workflows",
};

/**
 * Convert a camelCase command name to kebab-case for route path matching.
 * e.g. "createFromSeed" -> "create-from-seed", "softDelete" -> "soft-delete"
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Load the commands manifest (kitchen.commands.json) and build a set of
 * expected command route paths for the COMMAND_ROUTE_ORPHAN check.
 */
async function loadCommandManifestPaths(
  manifestPath: string
): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    const entries: CommandManifestEntry[] = JSON.parse(raw);
    const paths = new Set<string>();
    for (const entry of entries) {
      const domain = ENTITY_DOMAIN_MAP[entry.entity];
      if (!domain) continue;
      // Build both camelCase and kebab-case variants since routes may use either
      const kebabCommand = toKebabCase(entry.command);
      paths.add(`${domain}/commands/${kebabCommand}/route.ts`);
      if (kebabCommand !== entry.command) {
        paths.add(`${domain}/commands/${entry.command}/route.ts`);
      }
    }
    return paths;
  } catch {
    return new Set();
  }
}

/**
 * Load the exemptions registry.
 */
async function loadExemptions(
  exemptionsPath: string
): Promise<ExemptionEntry[]> {
  try {
    const raw = await fs.readFile(exemptionsPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function auditRoutesCommand(
  options: AuditRoutesOptions = {}
): Promise<void> {
  const spinner = ora("Auditing route boundaries").start();

  try {
    const root = path.resolve(process.cwd(), options.root || ".");
    const tenantField = options.tenantField || "tenantId";
    const deletedField = options.deletedField || "deletedAt";
    const locationField = options.locationField || "locationId";

    // Load ownership context
    const commandsManifestPath = options.commandsManifest
      ? path.resolve(options.commandsManifest)
      : path.resolve(
          root,
          "packages/manifest-ir/ir/kitchen/kitchen.commands.json"
        );
    const exemptionsPath = options.exemptions
      ? path.resolve(options.exemptions)
      : path.resolve(
          root,
          "packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json"
        );

    const commandManifestPaths =
      await loadCommandManifestPaths(commandsManifestPath);
    const exemptions = await loadExemptions(exemptionsPath);

    const ownershipContext: OwnershipAuditContext = {
      commandManifestPaths,
      exemptions,
    };

    const routeFiles = await discoverRouteFiles(root);

    if (routeFiles.length === 0) {
      spinner.warn(`No route files found under ${root}`);
      return;
    }

    const findings: RouteAuditFinding[] = [];
    let filesAudited = 0;

    for (const routeFile of routeFiles) {
      const content = await fs.readFile(routeFile, "utf-8");
      const result = auditRouteFileContent(
        content,
        routeFile,
        {
          tenantField,
          deletedField,
          locationField,
        },
        ownershipContext
      );

      if (result.methods.length > 0) {
        filesAudited++;
        findings.push(...result.findings);
      }
    }

    const errors = findings.filter((f) => f.severity === "error");
    const warnings = findings.filter((f) => f.severity === "warning");

    if (options.format === "json") {
      spinner.stop();
      console.log(
        JSON.stringify(
          {
            root,
            filesAudited,
            errors: errors.length,
            warnings: warnings.length,
            findings,
          },
          null,
          2
        )
      );
    } else {
      if (findings.length === 0) {
        spinner.succeed(
          `Audited ${filesAudited} route file(s) — no boundary issues found`
        );
      } else {
        spinner.warn(
          `Audited ${filesAudited} route file(s) — ${errors.length} error(s), ${warnings.length} warning(s)`
        );
        console.log("");
        for (const finding of findings) {
          const relFile =
            path.relative(process.cwd(), finding.file) || finding.file;
          const color = finding.severity === "error" ? chalk.red : chalk.yellow;
          console.log(
            color(`  [${finding.severity.toUpperCase()}] ${finding.code}`)
          );
          console.log(`    ${relFile}`);
          console.log(`    ${finding.message}`);
          if (finding.suggestion) {
            console.log(chalk.gray(`    -> ${finding.suggestion}`));
          }
          console.log("");
        }
      }

      console.log(chalk.bold("SUMMARY:"));
      console.log(`  Root: ${root}`);
      console.log(`  Files audited: ${filesAudited}`);
      console.log(`  Errors: ${errors.length}`);
      console.log(`  Warnings: ${warnings.length}`);
      console.log(
        `  Fields: tenant=${tenantField}, deleted=${deletedField}, location=${locationField}`
      );
    }

    if (errors.length > 0 || (options.strict && warnings.length > 0)) {
      process.exit(1);
    }
  } catch (error: any) {
    spinner.fail(`Route audit failed: ${error.message}`);
    process.exit(1);
  }
}
