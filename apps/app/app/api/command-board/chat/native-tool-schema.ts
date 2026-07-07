/**
 * Native IR-derived tool schemas for the command catalog.
 *
 * The chat agent's command discovery is driven by the compiled Manifest IR
 * (manifest/ir/kitchen.ir.json) via @angriff36/manifest's agent-sdk
 * (`commandToOpenAITool` / `irParametersToJsonSchema`) — the same generator the
 * package ships for LLM tool definitions — instead of the old hand-rolled
 * string/number/boolean flattening of the route surface.
 *
 * Two deliberate adapters, documented rather than hidden:
 *  1. Type-name normalization. kitchen.ir.json compiles primitive types as
 *     lowercase (`string`, `int`, `money`, `datetime`, `decimal`, `array`, …),
 *     but the agent-sdk's json-schema converter keys on the canonical
 *     capitalized Manifest type names (`String`, `Number`, `Money`, `DateTime`,
 *     `Array`, …). We normalize before conversion so Money→number,
 *     DateTime→date-time string, Array<T>→typed array etc. actually resolve
 *     instead of collapsing to `string`.
 *  2. Loader shim. The agent-sdk barrel (index.js) has extensionless ESM imports
 *     that fail Node's strict resolver, and its submodules are not in the
 *     package `exports` map — so we load the self-contained `tool-definitions.js`
 *     via createRequire, mirroring packages/mcp-server/src/lib/agent-sdk.ts.
 *
 * Everything here is BEST-EFFORT: if the IR file or the agent-sdk cannot be
 * loaded (e.g. not bundled into a serverless function), `getNativeCommandSchema`
 * returns null and the caller falls back to the coarse route-surface schema, so
 * the chat agent never breaks — it only loses the richer typing.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

export type CoarseParamType = "string" | "number" | "boolean";

interface IrType {
  generic?: IrType;
  name: string;
  nullable?: boolean;
}

interface IrParameter {
  defaultValue?: unknown;
  name: string;
  required?: boolean;
  type: IrType;
}

interface IrCommand {
  emits?: string[];
  entity?: string;
  guards?: unknown[];
  module?: string;
  name: string;
  parameters?: IrParameter[];
  policies?: string[];
}

interface CompiledIr {
  commands?: IrCommand[];
}

interface OpenAIToolShape {
  function?: {
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

interface AgentSdkToolgen {
  commandToOpenAITool: (
    cmd: IrCommand,
    opts: Record<string, unknown>,
    ir: CompiledIr
  ) => OpenAIToolShape;
}

export interface NativeCommandSchema {
  /** IR-native description (Entity | Module | Parameters | Guards | Emits …). */
  description: string;
  /** Coarse param types the planner/text-registry + arg coercion consume. */
  params: Array<{ name: string; type: CoarseParamType; required: boolean }>;
  /** IR-native JSON Schema, or null when the agent-sdk toolgen is unavailable —
   *  coarse params above still come from the IR; the caller falls back to its
   *  own JSON schema for the tool definition. */
  parameters: Record<string, unknown> | null;
}

const IR_RELATIVE_PATH = join("manifest", "ir", "kitchen.ir.json");

/** lowercase compiled IR type name → canonical Manifest type name for the sdk. */
const CANONICAL_TYPE_NAME: Record<string, string> = {
  string: "String",
  number: "Number",
  int: "Number",
  integer: "Number",
  float: "Number",
  decimal: "Number",
  money: "Money",
  boolean: "Boolean",
  bool: "Boolean",
  datetime: "DateTime",
  timestamp: "DateTime",
  date: "Date",
  array: "Array",
  json: "JSON",
  id: "ID",
  uuid: "UUID",
  email: "Email",
  url: "URL",
  any: "Any",
};

const NUMERIC_TYPES = new Set([
  "number",
  "int",
  "integer",
  "float",
  "decimal",
  "money",
]);
const BOOLEAN_TYPES = new Set(["boolean", "bool"]);

export function coarseTypeOf(irTypeName: string): CoarseParamType {
  const name = irTypeName.toLowerCase();
  if (NUMERIC_TYPES.has(name)) {
    return "number";
  }
  if (BOOLEAN_TYPES.has(name)) {
    return "boolean";
  }
  return "string";
}

function canonicalizeType(type: IrType): IrType {
  const canonical: IrType = {
    name: CANONICAL_TYPE_NAME[type.name?.toLowerCase?.()] ?? "String",
    nullable: type.nullable,
  };
  if (type.generic) {
    canonical.generic = canonicalizeType(type.generic);
  }
  return canonical;
}

// ── Best-effort loaders (cached with a null sentinel on failure) ──────────────

let irIndexResolved = false;
let irIndex: Map<string, IrCommand> | null = null;
let compiledIr: CompiledIr | null = null;

let toolgenResolved = false;
let toolgen: AgentSdkToolgen | null = null;

function candidateRoots(): string[] {
  const roots: string[] = [];
  const envRoot = process.env.MANIFEST_REPO_ROOT;
  if (envRoot) {
    roots.push(envRoot);
  }
  let current = process.cwd();
  while (true) {
    roots.push(current);
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  const fileDir = import.meta.dirname;
  if (fileDir) {
    current = fileDir;
    while (true) {
      if (!roots.includes(current)) {
        roots.push(current);
      }
      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }
  roots.push("/var/task", "/var/task/apps/app");
  return roots;
}

function resolveIrPath(): string | null {
  for (const root of candidateRoots()) {
    const candidate = resolve(root, IR_RELATIVE_PATH);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function loadIrIndex(): Map<string, IrCommand> | null {
  if (irIndexResolved) {
    return irIndex;
  }
  irIndexResolved = true;
  try {
    const irPath = resolveIrPath();
    if (!irPath) {
      return null;
    }
    const parsed = JSON.parse(readFileSync(irPath, "utf8")) as CompiledIr;
    const commands = Array.isArray(parsed.commands) ? parsed.commands : [];
    const index = new Map<string, IrCommand>();
    for (const command of commands) {
      if (command.entity && command.name) {
        index.set(`${command.entity}.${command.name}`, command);
      }
    }
    compiledIr = parsed;
    irIndex = index;
  } catch {
    irIndex = null;
    compiledIr = null;
  }
  return irIndex;
}

function loadToolgen(): AgentSdkToolgen | null {
  if (toolgenResolved) {
    return toolgen;
  }
  toolgenResolved = true;
  try {
    const nodeRequire = createRequire(import.meta.url);
    const pkgRoot = dirname(
      nodeRequire.resolve("@angriff36/manifest/package.json")
    );
    // Indirection so Turbopack cannot statically fold this require into a
    // bundled module reference (it hard-fails the whole route otherwise);
    // combined with serverExternalPackages: ["@angriff36/manifest"].
    const dynamicLoad = nodeRequire as unknown as (p: string) => unknown;
    const sdkModule = dynamicLoad(
      join(pkgRoot, "dist", "manifest", "agent-sdk", "tool-definitions.js")
    ) as AgentSdkToolgen;
    if (typeof sdkModule.commandToOpenAITool === "function") {
      toolgen = sdkModule;
    }
  } catch {
    toolgen = null;
  }
  return toolgen;
}

/**
 * Build the IR-native tool schema for a command, or null if the IR / agent-sdk
 * is unavailable or the command is not in the IR (caller falls back).
 */
export function getNativeCommandSchema(
  entity: string,
  command: string
): NativeCommandSchema | null {
  const index = loadIrIndex();
  // Coarse param types need ONLY the IR — never gate them on the agent-sdk
  // loader (when it failed, numeric params fell back to route-surface
  // "string" and every AI dispatch of a number 400'd the zod gate).
  if (!index) {
    return null;
  }
  const generator = loadToolgen();
  const irCommand = index.get(`${entity}.${command}`);
  if (!irCommand) {
    return null;
  }

  const rawParams = Array.isArray(irCommand.parameters)
    ? irCommand.parameters
    : [];
  const coarseParams = rawParams.map((param) => ({
    name: param.name,
    type: coarseTypeOf(param.type?.name ?? "string"),
    // 3.1.3 IR: optional params carry required:false; required params OMIT the field
    required: param.required !== false,
  }));
  if (!(generator && compiledIr)) {
    return {
      description: `${entity}.${command}`,
      params: coarseParams,
      parameters: null,
    };
  }
  const canonicalCommand: IrCommand = {
    ...irCommand,
    parameters: rawParams.map((param) => ({
      ...param,
      type: canonicalizeType(param.type),
    })),
  };

  try {
    const tool = generator.commandToOpenAITool(
      canonicalCommand,
      {
        includeGuardHints: true,
        includePolicyHints: false,
        includeBuiltins: false,
        toolNameStrategy: "snake",
      },
      compiledIr
    );
    const parameters = tool.function?.parameters;
    if (!parameters) {
      return {
        description: tool.function?.description ?? `${entity}.${command}`,
        params: coarseParams,
        parameters: null,
      };
    }
    return {
      description: tool.function?.description ?? `${entity}.${command}`,
      parameters,
      params: coarseParams,
    };
  } catch {
    // toolgen blew up on this command — coarse IR typing is still valid.
    return {
      description: `${entity}.${command}`,
      params: coarseParams,
      parameters: null,
    };
  }
}
