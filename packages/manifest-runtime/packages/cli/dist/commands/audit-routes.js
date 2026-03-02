import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { glob } from "glob";
import ora from "ora";
import * as ts from "typescript";
/**
 * Validate exemption metadata discipline.
 *
 * In strict mode, missing owner or missing expiry (without allowPermanent)
 * produces errors. In non-strict mode, the same issues produce warnings.
 *
 * This function NEVER modifies the exemptions list or affects route-audit
 * findings — it only returns diagnostics about the exemptions themselves.
 */
export function validateExemptions(exemptions, opts = {}) {
    const diagnostics = [];
    const severity = opts.strict ? "error" : "warning";
    for (const entry of exemptions) {
        if (!entry.owner) {
            diagnostics.push({
                path: entry.path,
                field: "owner",
                message: "Exemption is missing an owner.",
                severity,
            });
        }
        const hasExpiry = entry.expiresOn || entry.expiresInDays != null;
        if (!(hasExpiry || entry.allowPermanent)) {
            diagnostics.push({
                path: entry.path,
                field: "expiresOn",
                message: "Exemption has no expiry and allowPermanent is not set.",
                severity,
            });
        }
    }
    return diagnostics;
}
/**
 * Canonical set of ownership-rule finding codes.
 *
 * These are the ONLY codes that the `--strict` gate considers.
 * Quality/hygiene rules (WRITE_ROUTE_BYPASSES_RUNTIME, READ_MISSING_*,
 * etc.) never poison the strict exit code.
 *
 * To add a new ownership rule: add it here, add the audit logic,
 * and add a test in audit-routes.test.ts that references this set.
 * No silent expansion — this set is the single source of truth.
 */
export const OWNERSHIP_RULE_CODES = new Set([
    "COMMAND_ROUTE_ORPHAN",
    "COMMAND_ROUTE_MISSING_RUNTIME_CALL",
    "WRITE_OUTSIDE_COMMANDS_NAMESPACE",
]);
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
const DIRECT_QUERY_RE = /\b(findMany|findFirst|findUnique|groupBy|aggregate)\s*\(/;
/**
 * Matches routes that execute through the manifest runtime.
 * - `runCommand(` — direct RuntimeEngine call
 * - `executeManifestCommand(` — reusable handler that wraps runCommand
 *   (see apps/api/lib/manifest-command-handler.ts)
 */
const RUNTIME_COMMAND_RE = /\b(?:runCommand|executeManifestCommand)\s*\(/;
/**
 * Matches routes that use the executeManifestCommand helper specifically.
 * These routes get user context automatically (the helper calls requireCurrentUser),
 * so the WRITE_ROUTE_USER_CONTEXT_NOT_VISIBLE warning should be suppressed.
 */
const EXECUTE_MANIFEST_COMMAND_RE = /\bexecuteManifestCommand\s*\(/;
const USER_CONTEXT_RE = /\buser\s*:\s*\{/;
function detectExportedMethods(content) {
    const methods = new Set();
    const re = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;
    let match = re.exec(content);
    while (match) {
        methods.add(match[1]);
        match = re.exec(content);
    }
    return Array.from(methods);
}
function escapeRegexToken(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function hasFieldToken(content, fieldName) {
    const fieldRe = new RegExp(`\\b${escapeRegexToken(fieldName)}\\b`);
    return fieldRe.test(content);
}
function propertyNameMatches(name, expected) {
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
function hasFieldInObjectLiteral(objectLiteral, fieldName) {
    for (const prop of objectLiteral.properties) {
        if (ts.isPropertyAssignment(prop) &&
            propertyNameMatches(prop.name, fieldName)) {
            return true;
        }
        if (ts.isShorthandPropertyAssignment(prop) &&
            prop.name.text === fieldName) {
            return true;
        }
    }
    return false;
}
function isDirectQueryCall(node) {
    if (ts.isPropertyAccessExpression(node.expression)) {
        return DIRECT_QUERY_METHODS.has(node.expression.name.text);
    }
    if (ts.isElementAccessExpression(node.expression) &&
        ts.isStringLiteral(node.expression.argumentExpression)) {
        return DIRECT_QUERY_METHODS.has(node.expression.argumentExpression.text);
    }
    return false;
}
function hasLocationFilterInDirectQueryWhere(content, locationField) {
    const sourceFile = ts.createSourceFile("route.ts", content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let found = false;
    const visit = (node) => {
        if (found) {
            return;
        }
        if (ts.isCallExpression(node) && isDirectQueryCall(node)) {
            const firstArg = node.arguments[0];
            if (firstArg && ts.isObjectLiteralExpression(firstArg)) {
                const whereProperty = firstArg.properties.find((prop) => ts.isPropertyAssignment(prop) &&
                    propertyNameMatches(prop.name, "where"));
                if (whereProperty &&
                    ts.isObjectLiteralExpression(whereProperty.initializer) &&
                    hasFieldInObjectLiteral(whereProperty.initializer, locationField)) {
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
function normalizeRoutePath(filePath) {
    return filePath.replace(/\\/g, "/");
}
/**
 * Check if a normalized route path is inside the commands namespace.
 */
function isInCommandsNamespace(normalizedPath) {
    return normalizedPath.includes("/commands/");
}
/**
 * Check if a route file path matches an exemption entry.
 * Matches if the normalized path ends with the exemption path.
 */
function isExempted(normalizedPath, method, exemptions) {
    for (const exemption of exemptions) {
        const exemptionNormalized = exemption.path.replace(/\\/g, "/");
        if (normalizedPath.endsWith(exemptionNormalized) &&
            exemption.methods.includes(method)) {
            return true;
        }
    }
    return false;
}
export function auditRouteFileContent(content, file, options, ownershipContext) {
    const findings = [];
    const methods = detectExportedMethods(content);
    if (methods.length === 0) {
        return { methods, findings };
    }
    const hasRunCommand = RUNTIME_COMMAND_RE.test(content);
    const hasDirectQuery = DIRECT_QUERY_RE.test(content);
    const locationReferenced = hasFieldToken(content, options.locationField);
    const hasLocationFilter = hasLocationFilterInDirectQueryWhere(content, options.locationField);
    for (const method of methods) {
        if (WRITE_METHODS.has(method) && !hasRunCommand) {
            findings.push({
                file,
                severity: "error",
                code: "WRITE_ROUTE_BYPASSES_RUNTIME",
                message: `${method} route appears to bypass runtime command execution (no runCommand call found).`,
                suggestion: "Write routes should execute through RuntimeEngine.runCommand to enforce policy/guard/constraint semantics.",
            });
        }
        if (WRITE_METHODS.has(method) &&
            hasRunCommand &&
            !USER_CONTEXT_RE.test(content) &&
            !EXECUTE_MANIFEST_COMMAND_RE.test(content)) {
            findings.push({
                file,
                severity: "warning",
                code: "WRITE_ROUTE_USER_CONTEXT_NOT_VISIBLE",
                message: `${method} route calls runCommand but no explicit user context object was detected.`,
                suggestion: "Ensure createManifestRuntime receives user context when command policies/guards reference user.* bindings.",
            });
        }
        if (READ_METHODS.has(method) && hasDirectQuery) {
            if (!hasFieldToken(content, options.tenantField)) {
                findings.push({
                    file,
                    severity: "warning",
                    code: "READ_MISSING_TENANT_SCOPE",
                    message: `GET route uses direct query but '${options.tenantField}' predicate was not detected.`,
                    suggestion: "Add tenant scoping to read queries or move read authorization/scope to an enforced data policy boundary.",
                });
            }
            const softDeletePattern = new RegExp(`\\b${escapeRegexToken(options.deletedField)}\\s*:\\s*null\\b`);
            if (!softDeletePattern.test(content)) {
                findings.push({
                    file,
                    severity: "warning",
                    code: "READ_MISSING_SOFT_DELETE_FILTER",
                    message: `GET route uses direct query but '${options.deletedField}: null' filter was not detected.`,
                    suggestion: "Apply a default soft-delete exclusion filter for analytics/listing correctness, unless intentionally reading deleted rows.",
                });
            }
            if (locationReferenced && !hasLocationFilter) {
                findings.push({
                    file,
                    severity: "warning",
                    code: "READ_LOCATION_REFERENCE_WITHOUT_FILTER",
                    message: `GET route references '${options.locationField}' but a matching query filter was not detected.`,
                    suggestion: "If the endpoint is location-scoped, include the location predicate in the direct query where-clause.",
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
                if (WRITE_METHODS.has(method) &&
                    !isExempted(normalizedFile, method, ownershipContext.exemptions)) {
                    findings.push({
                        file,
                        severity: "warning",
                        code: "WRITE_OUTSIDE_COMMANDS_NAMESPACE",
                        message: `${method} route is outside the commands namespace and not in the exemption registry.`,
                        suggestion: "Move this route to commands/<command>/route.ts or register an explicit exemption in audit-routes-exemptions.json.",
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
                message: "Command route does not call runCommand — all command routes must execute through runtime.",
                suggestion: "All command routes must execute through runtime.runCommand.",
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
            if (routeRelative &&
                !ownershipContext.commandManifestPaths.has(routeRelative)) {
                // Check if this orphan route is explicitly exempted
                const isOrphanExempted = methods.some((m) => isExempted(normalizedFile, m, ownershipContext.exemptions));
                if (!isOrphanExempted) {
                    findings.push({
                        file,
                        severity: "warning",
                        code: "COMMAND_ROUTE_ORPHAN",
                        message: `Command route "${routeRelative}" has no backing entry in kitchen.commands.json.`,
                        suggestion: "This command route has no IR backing. Delete it or add the command to your manifest.",
                    });
                }
            }
        }
    }
    return { methods, findings };
}
async function discoverRouteFiles(root) {
    const files = await Promise.all(ROUTE_PATTERNS.map((pattern) => glob(pattern, {
        cwd: root,
        absolute: true,
        ignore: [
            "**/node_modules/**",
            "**/.next/**",
            "**/dist/**",
            "**/build/**",
        ],
    })));
    return Array.from(new Set(files.flat()));
}
// Entity-to-domain mapping for building expected command route paths.
// Must stay in sync with ENTITY_DOMAIN_MAP in scripts/manifest/generate.mjs.
const ENTITY_DOMAIN_MAP = {
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
function toKebabCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
/**
 * Load the commands manifest (kitchen.commands.json) and build a set of
 * expected command route paths for the COMMAND_ROUTE_ORPHAN check.
 */
async function loadCommandManifestPaths(manifestPath) {
    try {
        const raw = await fs.readFile(manifestPath, "utf-8");
        const entries = JSON.parse(raw);
        const paths = new Set();
        for (const entry of entries) {
            const domain = ENTITY_DOMAIN_MAP[entry.entity];
            if (!domain)
                continue;
            // Build both camelCase and kebab-case variants since routes may use either
            const kebabCommand = toKebabCase(entry.command);
            paths.add(`${domain}/commands/${kebabCommand}/route.ts`);
            if (kebabCommand !== entry.command) {
                paths.add(`${domain}/commands/${entry.command}/route.ts`);
            }
        }
        return paths;
    }
    catch {
        return new Set();
    }
}
/**
 * Load the exemptions registry.
 */
async function loadExemptions(exemptionsPath) {
    try {
        const raw = await fs.readFile(exemptionsPath, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
}
export async function auditRoutesCommand(options = {}) {
    const spinner = ora("Auditing route boundaries").start();
    try {
        const root = path.resolve(process.cwd(), options.root || ".");
        const tenantField = options.tenantField || "tenantId";
        const deletedField = options.deletedField || "deletedAt";
        const locationField = options.locationField || "locationId";
        // Load ownership context
        const commandsManifestPath = options.commandsManifest
            ? path.resolve(options.commandsManifest)
            : path.resolve(root, "packages/manifest-ir/ir/kitchen/kitchen.commands.json");
        const exemptionsPath = options.exemptions
            ? path.resolve(options.exemptions)
            : path.resolve(root, "packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json");
        const commandManifestPaths = await loadCommandManifestPaths(commandsManifestPath);
        const exemptions = await loadExemptions(exemptionsPath);
        // Validate exemption metadata discipline (owner, expiry).
        // --strict implies strict exemption validation: exemptions can't be used
        // as a deploy-unblocking hack without proper ownership and sunset dates.
        // This never alters the exemptions list or route-audit findings.
        const exemptionDiagnostics = validateExemptions(exemptions, {
            strict: options.strict,
        });
        const ownershipContext = {
            commandManifestPaths,
            exemptions,
        };
        const routeFiles = await discoverRouteFiles(root);
        if (routeFiles.length === 0) {
            spinner.warn(`No route files found under ${root}`);
            return;
        }
        const findings = [];
        let filesAudited = 0;
        for (const routeFile of routeFiles) {
            const content = await fs.readFile(routeFile, "utf-8");
            const result = auditRouteFileContent(content, routeFile, {
                tenantField,
                deletedField,
                locationField,
            }, ownershipContext);
            if (result.methods.length > 0) {
                filesAudited++;
                findings.push(...result.findings);
            }
        }
        const errors = findings.filter((f) => f.severity === "error");
        const warnings = findings.filter((f) => f.severity === "warning");
        if (options.format === "json") {
            spinner.stop();
            console.log(JSON.stringify({
                root,
                filesAudited,
                errors: errors.length,
                warnings: warnings.length,
                findings,
            }, null, 2));
        }
        else {
            if (findings.length === 0) {
                spinner.succeed(`Audited ${filesAudited} route file(s) — no boundary issues found`);
            }
            else {
                spinner.warn(`Audited ${filesAudited} route file(s) — ${errors.length} error(s), ${warnings.length} warning(s)`);
                console.log("");
                for (const finding of findings) {
                    const relFile = path.relative(process.cwd(), finding.file) || finding.file;
                    const color = finding.severity === "error" ? chalk.red : chalk.yellow;
                    console.log(color(`  [${finding.severity.toUpperCase()}] ${finding.code}`));
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
            console.log(`  Fields: tenant=${tenantField}, deleted=${deletedField}, location=${locationField}`);
            // Report exemption metadata diagnostics (if any)
            if (exemptionDiagnostics.length > 0) {
                const exemptionErrors = exemptionDiagnostics.filter((d) => d.severity === "error");
                const exemptionWarnings = exemptionDiagnostics.filter((d) => d.severity === "warning");
                console.log("");
                console.log(chalk.bold(`Exemption metadata: ${exemptionErrors.length} error(s), ${exemptionWarnings.length} warning(s)`));
                for (const d of exemptionDiagnostics) {
                    const color = d.severity === "error" ? chalk.red : chalk.yellow;
                    console.log(color(`  [${d.severity.toUpperCase()}] ${d.path}: ${d.message}`));
                }
            }
        }
        // Strict gate: only ownership-rule findings trigger failure.
        // Quality/hygiene warnings (READ_MISSING_*, WRITE_ROUTE_BYPASSES_RUNTIME)
        // never poison the strict exit code.
        //
        // When --strict is on, exemption metadata discipline is also enforced:
        // exemptions without owner or expiry (unless allowPermanent) block the build.
        // This prevents exemptions from being used as a deploy-unblocking hack.
        const ownershipErrors = errors.filter((f) => OWNERSHIP_RULE_CODES.has(f.code));
        const ownershipWarnings = warnings.filter((f) => OWNERSHIP_RULE_CODES.has(f.code));
        if (options.strict) {
            const exemptionErrors = exemptionDiagnostics.filter((d) => d.severity === "error");
            const hasOwnershipIssues = ownershipErrors.length > 0 || ownershipWarnings.length > 0;
            const hasExemptionIssues = exemptionErrors.length > 0;
            if (hasOwnershipIssues || hasExemptionIssues) {
                if (hasOwnershipIssues) {
                    console.log(chalk.red(`  Strict gate: ${ownershipErrors.length} ownership error(s), ${ownershipWarnings.length} ownership warning(s)`));
                }
                if (hasExemptionIssues) {
                    console.log(chalk.red(`  Strict gate: ${exemptionErrors.length} exemption metadata error(s)`));
                }
                console.log(chalk.red("  → exit 1"));
                process.exit(1);
            }
        }
        else {
            // Default mode: fail on any error-severity finding
            if (errors.length > 0) {
                process.exit(1);
            }
        }
    }
    catch (error) {
        spinner.fail(`Route audit failed: ${error.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=audit-routes.js.map