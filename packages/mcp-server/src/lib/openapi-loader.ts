/**
 * Loads and caches the generated OpenAPI spec for the MCP server.
 *
 * The spec is produced by `pnpm manifest:openapi` at the monorepo-root
 * `manifest/api-docs/openapi.json`. It is the HTTP-transport view of the API
 * (route paths, methods, status codes, request/response schemas) — complementary
 * to the IR-semantic view served by ir-introspection.ts.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** A single OpenAPI operation (get/post/...) — loosely typed for traversal. */
export interface OperationObject {
  description?: string;
  operationId?: string;
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  summary?: string;
  tags?: string[];
}

/** OpenAPI path item: a map of HTTP method → operation. */
export type PathItemObject = Partial<Record<HttpMethod, OperationObject>>;

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export const HTTP_METHODS: HttpMethod[] = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
];

/** Minimal OpenAPI document shape used by the MCP tools. */
export interface OpenApiSpec {
  components?: { schemas?: Record<string, unknown> };
  info?: Record<string, unknown>;
  openapi?: string;
  paths: Record<string, PathItemObject>;
  servers?: Record<string, unknown>[];
  [key: string]: unknown;
}

const SPEC_REL = "manifest/api-docs/openapi.json";

let cached: OpenApiSpec | null = null;

/** Walk up from cwd (or MCP_PROJECT_ROOT) to the monorepo root. */
function resolveFromRepoRoot(relPath: string): string {
  let dir = process.env.MCP_PROJECT_ROOT || process.cwd();
  for (;;) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return resolve(dir, relPath);
    }
    const parent = resolve(dir, "..");
    if (parent === dir) {
      throw new Error("Could not find monorepo root (pnpm-workspace.yaml)");
    }
    dir = parent;
  }
}

/** Load + memoize the OpenAPI spec. Throws if it has not been generated. */
export function getOpenApiSpec(): OpenApiSpec {
  if (cached) {
    return cached;
  }
  const specPath = resolveFromRepoRoot(SPEC_REL);
  if (!existsSync(specPath)) {
    throw new Error(
      `OpenAPI spec not found at ${specPath}. Run 'pnpm manifest:openapi' to generate it.`
    );
  }
  cached = JSON.parse(readFileSync(specPath, "utf8")) as OpenApiSpec;
  return cached;
}

export function invalidateOpenApiCache(): void {
  cached = null;
}

/** A flattened endpoint entry for compact listing. */
export interface EndpointSummary {
  method: HttpMethod;
  operationId?: string;
  path: string;
  summary?: string;
  tags?: string[];
}

/** Flatten the spec's paths into one compact entry per (path, method). */
export function listEndpoints(spec: OpenApiSpec): EndpointSummary[] {
  const out: EndpointSummary[] = [];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) {
        continue;
      }
      out.push({
        operationId: op.operationId,
        method,
        path,
        summary: op.summary,
        tags: op.tags,
      });
    }
  }
  return out;
}

/** Case-insensitive check that an operation is tagged for the given entity. */
function opHasEntityTag(op: OperationObject, entity: string): boolean {
  const target = entity.toLowerCase();
  return (op.tags ?? []).some((t) => t.toLowerCase() === target);
}

/**
 * Resolve a single endpoint:
 *  - with `command` → the POST `/{entity}/commands/{command}` operation
 *  - without `command` → the GET list `/{entity}` operation
 * Matching is case-insensitive on both entity tag and command segment.
 */
export function findEndpoint(
  spec: OpenApiSpec,
  entity: string,
  command?: string
): { method: HttpMethod; path: string; operation: OperationObject } | null {
  const entries = Object.entries(spec.paths ?? {});

  if (command) {
    const cmd = command.toLowerCase();
    for (const [path, item] of entries) {
      const op = item.post;
      if (!op) {
        continue;
      }
      const segs = path.toLowerCase().split("/").filter(Boolean);
      const idx = segs.indexOf("commands");
      const isCmd = idx >= 0 && segs[idx + 1] === cmd;
      if (isCmd && opHasEntityTag(op, entity)) {
        return { method: "post", path, operation: op };
      }
    }
    return null;
  }

  // List endpoint: GET on a path with no /commands/ and no /{id} param.
  for (const [path, item] of entries) {
    const op = item.get;
    if (!op) {
      continue;
    }
    if (path.includes("/commands/") || path.includes("{")) {
      continue;
    }
    if (opHasEntityTag(op, entity)) {
      return { method: "get", path, operation: op };
    }
  }
  return null;
}

/** List command names available for an entity (for not-found hints). */
export function commandsForEntity(spec: OpenApiSpec, entity: string): string[] {
  const out: string[] = [];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    const op = item.post;
    if (!(op && opHasEntityTag(op, entity))) {
      continue;
    }
    const segs = path.split("/").filter(Boolean);
    const idx = segs.indexOf("commands");
    if (idx >= 0 && segs[idx + 1]) {
      out.push(segs[idx + 1]);
    }
  }
  return out.sort();
}

const MAX_RESOLVED_SCHEMAS = 50;

/**
 * Collect the component schemas referenced (transitively) by an arbitrary JSON
 * node, returning a name → schema map. Bounded by MAX_RESOLVED_SCHEMAS and a
 * seen-set so cyclic `$ref`s terminate. This lets a caller understand a request /
 * response shape without deep-inlining (which can explode or loop).
 */
export function collectReferencedSchemas(
  node: unknown,
  spec: OpenApiSpec
): Record<string, unknown> {
  const schemas = spec.components?.schemas ?? {};
  const resolved: Record<string, unknown> = {};
  const queue: string[] = [];

  const REF_PREFIX = "#/components/schemas/";

  const scan = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const v of value) {
        scan(v);
      }
      return;
    }
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k === "$ref" && typeof v === "string" && v.startsWith(REF_PREFIX)) {
          queue.push(v.slice(REF_PREFIX.length));
        } else {
          scan(v);
        }
      }
    }
  };

  scan(node);

  while (
    queue.length > 0 &&
    Object.keys(resolved).length < MAX_RESOLVED_SCHEMAS
  ) {
    const name = queue.shift();
    if (!name || name in resolved) {
      continue;
    }
    const schema = schemas[name];
    if (schema === undefined) {
      continue;
    }
    resolved[name] = schema;
    scan(schema);
  }

  return resolved;
}
