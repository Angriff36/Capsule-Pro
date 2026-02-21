import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROUTE_SURFACE_MANIFEST_RELATIVE_PATH = join(
  "packages",
  "manifest-ir",
  "dist",
  "routes.manifest.json"
);

interface RouteSurfaceParam {
  name?: unknown;
  type?: unknown;
  required?: unknown;
  location?: unknown;
}

interface RouteSurfaceEntry {
  id?: unknown;
  path?: unknown;
  method?: unknown;
  source?: unknown;
  params?: unknown;
}

interface RouteSurfaceManifest {
  generatedAt?: unknown;
  routes?: unknown;
}

interface RouteSourceCommand {
  kind: "command";
  entity: string;
  command: string;
}

export interface CommandRoute {
  id: string;
  path: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  source: RouteSourceCommand;
  params: Array<{
    name: string;
    type: "string" | "number" | "boolean";
    required: boolean;
    location: "body" | "path" | "query";
  }>;
}

export interface CommandToolDefinition {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface CommandCatalog {
  commands: CommandRoute[];
  byEntityCommand: Map<string, CommandRoute>;
  canonicalEntityCommandByNormalizedKey: Map<string, string>;
  canonicalEntityCommandByLooseNormalizedKey: Map<string, string>;
  toolNameByEntityCommand: Map<string, string>;
  toolToEntityCommand: Map<string, string>;
  toolDefinitions: CommandToolDefinition[];
  canonicalEntityCommandPairs: string[];
  generatedAt: string | null;
}

export interface AliasResolution {
  userTerm: string;
  canonical: string;
  note: string;
}

const ALIAS_RULES: Array<{
  match: RegExp;
  userTerm: string;
  canonical: string;
  note: string;
}> = [
  {
    match: /\bvenue\b/i,
    userTerm: "venue",
    canonical: "Event.create (venueName + venueAddress)",
    note: "No Venue entity exists in manifest commands.",
  },
  {
    match: /\bstaff\b/i,
    userTerm: "staff",
    canonical: "User.create",
    note: "No Staff entity exists in manifest commands.",
  },
  {
    match: /\bbill\b/i,
    userTerm: "bill",
    canonical: "EventBudget.create",
    note: "No Bill entity exists in manifest commands.",
  },
  {
    match: /\bfull\s+menu\b/i,
    userTerm: "full menu",
    canonical: "Menu.create + MenuDish.create[] (+ BattleBoard.* optional)",
    note: "Use Menu and MenuDish commands; optionally link dishes on BattleBoard.",
  },
];

let cachedCatalog: CommandCatalog | null = null;
let cachedVersion = "";
let cachedManifestPath = "";
let hasLoggedCatalogDiagnostics = false;

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function listCandidateWorkspaceRoots(): string[] {
  const roots: string[] = [];
  let current = process.cwd();
  while (true) {
    roots.push(current);
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return roots;
}

function resolveManifestPath(): string {
  for (const root of listCandidateWorkspaceRoots()) {
    if (existsSync(join(root, "pnpm-workspace.yaml"))) {
      const manifestPath = resolve(root, ROUTE_SURFACE_MANIFEST_RELATIVE_PATH);
      if (!existsSync(manifestPath)) {
        throw new Error(
          `[manifest-command-tools] Missing required manifest route surface file: ${manifestPath}`
        );
      }
      return manifestPath;
    }
  }

  throw new Error(
    "[manifest-command-tools] Could not locate repository root (pnpm-workspace.yaml) from current working directory."
  );
}

function mapJsonType(input: unknown): "string" | "number" | "boolean" {
  if (input === "number") return "number";
  if (input === "boolean") return "boolean";
  return "string";
}

function sanitizeToolSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
}

function stableEntityCommandKey(entity: string, command: string): string {
  return `${entity}.${command}`;
}

function normalizeEntityCommandKey(key: string): string {
  return key.trim().toLowerCase();
}

function normalizeLooseSegment(segment: string): string {
  return segment.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeLooseEntityCommandKey(key: string): string {
  const [entity = "", command = ""] = key.split(".");
  return `${normalizeLooseSegment(entity)}.${normalizeLooseSegment(command)}`;
}

function extractEntityCommandPair(text: string): { entity: string; command: string } | null {
  const match = text.match(/([A-Za-z0-9_]+)\s*\.\s*([A-Za-z0-9_-]+)/);
  if (!match) {
    return null;
  }
  const [, entity, command] = match;
  if (!entity || !command) {
    return null;
  }
  return { entity, command };
}

function parseCommandRoute(route: RouteSurfaceEntry): CommandRoute | null {
  if (!(typeof route.path === "string")) {
    return null;
  }

  if (!(typeof route.method === "string")) {
    return null;
  }

  const method = route.method.toUpperCase();
  if (!WRITE_METHODS.has(method)) {
    return null;
  }
  if (
    !route.source ||
    typeof route.source !== "object" ||
    (route.source as { kind?: unknown }).kind !== "command"
  ) {
    return null;
  }

  const source = route.source as {
    kind?: unknown;
    entity?: unknown;
    command?: unknown;
  };

  if (!(typeof source.entity === "string" && typeof source.command === "string")) {
    return null;
  }

  const paramsInput = Array.isArray(route.params)
    ? (route.params as RouteSurfaceParam[])
    : [];

  const params = paramsInput
    .filter((param) => typeof param.name === "string")
    .map((param) => {
      const location: "body" | "path" | "query" =
        param.location === "path" || param.location === "query"
          ? param.location
          : "body";
      return {
        name: param.name as string,
        type: mapJsonType(param.type),
        required: param.required === true,
        location,
      };
    });

  const id =
    typeof route.id === "string"
      ? route.id
      : `${source.entity}.${source.command}`;

  return {
    id,
    path: route.path,
    method: method as CommandRoute["method"],
    source: {
      kind: "command",
      entity: source.entity,
      command: source.command,
    },
    params,
  };
}

function buildToolDescription(route: CommandRoute): string {
  const key = `${route.source.entity}.${route.source.command}`;
  const aliasNotes: string[] = [];
  if (key === "Event.create") {
    aliasNotes.push("Alias: 'venue' maps to venueName + venueAddress fields on Event.create.");
    aliasNotes.push("Run before dependent commands that need eventId.");
  }
  if (key === "User.create") {
    aliasNotes.push("Alias: 'staff' maps to User.create.");
  }
  if (key === "EventBudget.create") {
    aliasNotes.push("Alias: 'bill' maps to EventBudget.create.");
    aliasNotes.push("Run after Event.create because eventId is required.");
  }
  if (key === "Menu.create") {
    aliasNotes.push("Alias: 'full menu' starts with Menu.create then MenuDish.create for each dish.");
  }
  if (key === "MenuDish.create") {
    aliasNotes.push("Alias: 'full menu' includes one MenuDish.create per dish after Menu.create.");
  }
  if (key === "BattleBoard.create") {
    aliasNotes.push("Create board before BattleBoard.addDish commands.");
  }
  if (key === "BattleBoard.addDish") {
    aliasNotes.push("Run after BattleBoard.create for each dish link.");
  }
  return [
    `Execute canonical manifest command ${key} via ${route.path}.`,
    ...aliasNotes,
  ].join(" ");
}

function buildToolParameters(route: CommandRoute): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of route.params) {
    properties[param.name] = {
      type: param.type,
      description: `${param.location} parameter`,
    };
    if (param.required) {
      required.push(param.name);
    }
  }

  properties.idempotencyKey = {
    type: "string",
    description: "Optional idempotency key override.",
  };

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function logCatalogDiagnostics(manifestPath: string, manifest: RouteSurfaceManifest) {
  if (hasLoggedCatalogDiagnostics) {
    return;
  }

  const allRoutes = Array.isArray(manifest.routes)
    ? (manifest.routes as RouteSurfaceEntry[])
    : [];
  const commandRoutes = allRoutes.filter((route) => {
    if (!route.source || typeof route.source !== "object") {
      return false;
    }
    return (route.source as { kind?: unknown }).kind === "command";
  });
  const postRoutes = allRoutes.filter(
    (route) =>
      typeof route.method === "string" && route.method.toUpperCase() === "POST"
  );
  const commandPairs = commandRoutes
    .map((route) => {
      const source = route.source as { entity?: unknown; command?: unknown };
      if (
        typeof source.entity !== "string" ||
        typeof source.command !== "string"
      ) {
        return null;
      }
      return `${source.entity}.${source.command}`;
    })
    .filter((value): value is string => typeof value === "string")
    .slice(0, 10);

  console.info("[manifest-command-tools] Loaded route surface manifest", {
    manifestPath,
    generatedAt:
      typeof manifest.generatedAt === "string" ? manifest.generatedAt : null,
    totalRoutes: allRoutes.length,
    commandRoutes: commandRoutes.length,
    postRoutes: postRoutes.length,
    sampleEntityCommands: commandPairs,
  });
  hasLoggedCatalogDiagnostics = true;
}

function loadCatalogInternal(manifestPathInput?: string): CommandCatalog {
  const manifestPath = manifestPathInput
    ? resolve(manifestPathInput)
    : resolveManifestPath();
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as RouteSurfaceManifest;
  logCatalogDiagnostics(manifestPath, manifest);

  const generatedAt =
    typeof manifest.generatedAt === "string" ? manifest.generatedAt : null;
  const contentHash = createHash("sha256")
    .update(readFileSync(manifestPath, "utf8"))
    .digest("hex");
  const version = `${manifestPath}:${generatedAt ?? "none"}:${contentHash}`;

  if (
    cachedCatalog &&
    cachedVersion === version &&
    cachedManifestPath === manifestPath
  ) {
    return cachedCatalog;
  }

  const routes = Array.isArray(manifest.routes)
    ? (manifest.routes as RouteSurfaceEntry[])
    : [];

  const commands = routes
    .map((route) => parseCommandRoute(route))
    .filter((route): route is CommandRoute => route !== null)
    .sort((a, b) => {
      const aKey = `${a.source.entity}.${a.source.command}`;
      const bKey = `${b.source.entity}.${b.source.command}`;
      return aKey.localeCompare(bKey);
    });

  const byEntityCommand = new Map<string, CommandRoute>();
  const canonicalEntityCommandByNormalizedKey = new Map<string, string>();
  const canonicalEntityCommandByLooseNormalizedKey = new Map<string, string>();
  const toolNameByEntityCommand = new Map<string, string>();
  const toolToEntityCommand = new Map<string, string>();
  const toolNameCollisions = new Map<string, number>();
  const toolDefinitions: CommandToolDefinition[] = [];

  for (const command of commands) {
    const pair = stableEntityCommandKey(
      command.source.entity,
      command.source.command
    );
    byEntityCommand.set(pair, command);
    canonicalEntityCommandByNormalizedKey.set(
      normalizeEntityCommandKey(pair),
      pair
    );
    canonicalEntityCommandByLooseNormalizedKey.set(
      normalizeLooseEntityCommandKey(pair),
      pair
    );

    const baseName = `manifest_${sanitizeToolSegment(
      command.source.entity
    )}_${sanitizeToolSegment(command.source.command)}`;
    const collisionCount = toolNameCollisions.get(baseName) ?? 0;
    const toolName =
      collisionCount === 0 ? baseName : `${baseName}_${collisionCount + 1}`;
    toolNameCollisions.set(baseName, collisionCount + 1);

    toolNameByEntityCommand.set(pair, toolName);
    toolToEntityCommand.set(toolName, pair);
    toolDefinitions.push({
      type: "function",
      name: toolName,
      description: buildToolDescription(command),
      parameters: buildToolParameters(command),
    });
  }

  const catalog: CommandCatalog = {
    commands,
    byEntityCommand,
    canonicalEntityCommandByNormalizedKey,
    canonicalEntityCommandByLooseNormalizedKey,
    toolNameByEntityCommand,
    toolToEntityCommand,
    toolDefinitions,
    canonicalEntityCommandPairs: [...byEntityCommand.keys()].sort((a, b) =>
      a.localeCompare(b)
    ),
    generatedAt,
  };

  cachedCatalog = catalog;
  cachedVersion = version;
  cachedManifestPath = manifestPath;
  return catalog;
}

export function loadCommandCatalog(): CommandCatalog {
  return loadCatalogInternal();
}

export function loadCommandCatalogFromManifestPath(
  manifestPath: string
): CommandCatalog {
  return loadCatalogInternal(manifestPath);
}

export function resolveCanonicalEntityCommandPair(
  catalog: CommandCatalog,
  entityName: string,
  commandName: string
): string | null {
  const directPair = stableEntityCommandKey(entityName, commandName);
  if (catalog.byEntityCommand.has(directPair)) {
    return directPair;
  }
  const normalizedMatch =
    catalog.canonicalEntityCommandByNormalizedKey.get(
      normalizeEntityCommandKey(directPair)
    ) ?? null;
  if (normalizedMatch) {
    return normalizedMatch;
  }
  return (
    catalog.canonicalEntityCommandByLooseNormalizedKey.get(
      normalizeLooseEntityCommandKey(directPair)
    ) ?? null
  );
}

export function resolveCanonicalEntityCommandPairFromPair(
  catalog: CommandCatalog,
  pair: string
): string | null {
  const trimmedPair = pair.trim();
  if (catalog.byEntityCommand.has(trimmedPair)) {
    return trimmedPair;
  }

  const extracted = extractEntityCommandPair(trimmedPair);
  if (extracted) {
    const resolvedFromExtracted = resolveCanonicalEntityCommandPair(
      catalog,
      extracted.entity,
      extracted.command
    );
    if (resolvedFromExtracted) {
      return resolvedFromExtracted;
    }
  }

  const normalizedMatch =
    catalog.canonicalEntityCommandByNormalizedKey.get(
      normalizeEntityCommandKey(trimmedPair)
    ) ?? null;
  if (normalizedMatch) {
    return normalizedMatch;
  }
  return (
    catalog.canonicalEntityCommandByLooseNormalizedKey.get(
      normalizeLooseEntityCommandKey(trimmedPair)
    ) ?? null
  );
}

export function resolveAliases(userRequest: string): AliasResolution[] {
  const lowered = userRequest.toLowerCase();
  return ALIAS_RULES.filter((rule) => rule.match.test(lowered)).map((rule) => ({
    userTerm: rule.userTerm,
    canonical: rule.canonical,
    note: rule.note,
  }));
}

export function buildSimulationPlanSchema(
  catalog: CommandCatalog
): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      requestedSimulation: { type: "string" },
      resolvedAliases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            userTerm: { type: "string" },
            canonical: { type: "string" },
            note: { type: "string" },
          },
          required: ["userTerm", "canonical", "note"],
          additionalProperties: false,
        },
      },
      commandSequence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            entityCommand:
              catalog.canonicalEntityCommandPairs.length > 0
                ? {
                    type: "string",
                    enum: catalog.canonicalEntityCommandPairs,
                  }
                : { type: "string" },
            argsKv: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  value: { type: ["string", "number", "boolean", "null"] },
                },
                required: ["name", "value"],
                additionalProperties: false,
              },
            },
            note: { type: "string" },
          },
          required: ["entityCommand", "argsKv", "note"],
          additionalProperties: false,
        },
      },
      unfulfilledIntents: {
        type: "array",
        items: {
          type: "object",
          properties: {
            requested: { type: "string" },
            reason: { type: "string" },
            closestSupportedSequence: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["requested", "reason", "closestSupportedSequence"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "requestedSimulation",
      "resolvedAliases",
      "commandSequence",
      "unfulfilledIntents",
    ],
    additionalProperties: false,
  };
}
