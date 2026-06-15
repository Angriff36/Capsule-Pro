#!/usr/bin/env node
/**
 * Generates an OpenAPI 3.1.0 spec from the compiled Manifest IR using the
 * upstream OpenApiProjection, then post-processes paths to match Capsule-Pro's
 * actual Next.js route structure:
 *
 *   /{entity}/list          → /{entity}                    (list GET)
 *   /{entity}/{id}          → /{entity}/{id}               (detail GET, unchanged)
 *   /{entity}/{command}     → /{entity}/commands/{command} (command POST)
 *
 * Usage:
 *   node manifest/scripts/generate-openapi.mjs
 *   node manifest/scripts/generate-openapi.mjs --yaml   (converts to YAML via js-yaml)
 *
 * Output: manifest/api-docs/openapi.json (or .yaml)
 *
 * Task 5.3 — OpenAPI projection evaluation + wiring.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IR_PATH = join(root, "manifest", "ir", "kitchen.ir.json");
const OUT_DIR = join(root, "manifest", "api-docs");
const OUT_JSON = join(OUT_DIR, "openapi.json");

// ── Load IR ──
const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));
const entityNames = ir.entities.map((e) => e.name);

// ── Generate raw spec ──
const { OpenApiProjection } = await import(
  "@angriff36/manifest/projections/openapi"
);
const projection = new OpenApiProjection();
const genResult = projection.generate(ir, {
  surface: "openapi.spec",
  options: {
    basePath: "/api/manifest",
    info: {
      title: "Capsule-Pro API",
      version: ir.provenance?.schemaVersion || "0.12.203",
      description:
        "Auto-generated API specification for Capsule-Pro — a catering and events management platform. " +
        "All mutations go through the Manifest runtime dispatcher. Reads bypass runtime per constitution §10.",
    },
    // Server URLs are ORIGINS ONLY — the operation paths already carry the full
    // "/api/manifest/..." prefix (basePath above is baked into the paths). Including
    // /api/manifest here too would double-prefix every "Try it" request.
    servers: [
      {
        url: "/",
        description: "Same origin (the host serving these docs)",
      },
      {
        url: "https://pop-os.tail78dd9e.ts.net",
        description: "Dev (Tailscale)",
      },
    ],
    includeAuth: true,
    includeTenant: true,
    includeConstraintErrors: true,
  },
});

if (genResult.diagnostics?.length > 0) {
  for (const d of genResult.diagnostics) {
    console.error(`[openapi] ${d.severity}: ${d.code} — ${d.message}`);
  }
}

if (!genResult.artifacts?.length) {
  console.error("[openapi] No artifacts produced. Aborting.");
  process.exit(1);
}

const spec = JSON.parse(genResult.artifacts[0].code);

// ── Post-process paths ──
const fixedPaths = {};
let listRewrites = 0;
let commandRewrites = 0;

for (const [path, methods] of Object.entries(spec.paths || {})) {
  let fixed = path;

  // /{entity}/list → /{entity}
  if (fixed.endsWith("/list")) {
    fixed = fixed.slice(0, -5); // strip "/list"
    listRewrites++;
  }

  // POST /{entity}/{command} → POST /{entity}/commands/{command}
  // Heuristic: a path with exactly 3+ segments under basePath where the last
  // segment is a literal (not {id}) and the method is POST only → it's a command.
  const segments = fixed.split("/").filter(Boolean);
  if (
    segments.length >= 3 &&
    methods.post &&
    Object.keys(methods).length === 1
  ) {
    const last = segments.at(-1);
    // Skip if already has /commands/ segment or if last is {id}
    if (last !== "{id}" && !fixed.includes("/commands/")) {
      segments.splice(segments.length - 1, 0, "commands");
      fixed = `/${segments.join("/")}`;
      commandRewrites++;
    }
  }

  fixedPaths[fixed] = methods;
}

// ── Canonicalize path casing ──
// The upstream projection lowercases the entity segment (ActionMilestone →
// actionmilestone) and kebab-cases command segments (markCreated → mark-created).
// But BOTH the generic list route (resolveEntityAccessor expects the canonical
// PascalCase name) and the command dispatcher (matches the canonical entity.command
// key) require canonical casing — the working client sends e.g.
// /api/manifest/AiEventSetupSession/commands/markCreated. Without this, Scalar's
// "Try it" 404s for every multi-word entity/command. Rewrite both segments back to
// the IR's canonical names so the documented paths are the executable paths.
const entityCanonByLower = new Map(
  ir.entities.map((e) => [e.name.toLowerCase(), e.name])
);
const cmdCanonByEntitySlug = new Map();
for (const c of ir.commands || []) {
  const eLower = c.entity.toLowerCase();
  const kebab = c.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  cmdCanonByEntitySlug.set(`${eLower}::${c.name.toLowerCase()}`, c.name);
  cmdCanonByEntitySlug.set(`${eLower}::${kebab}`, c.name);
}

const canonicalPaths = {};
let casingRewrites = 0;
for (const [path, methods] of Object.entries(fixedPaths)) {
  const segs = path.split("/").filter(Boolean); // [api, manifest, <entity>, ...]
  const before = segs.join("/");
  const eLower = (segs[2] || "").toLowerCase();
  if (entityCanonByLower.has(eLower)) {
    segs[2] = entityCanonByLower.get(eLower);
  }
  const ci = segs.indexOf("commands");
  if (ci >= 0 && segs[ci + 1]) {
    const canon = cmdCanonByEntitySlug.get(
      `${eLower}::${segs[ci + 1].toLowerCase()}`
    );
    if (canon) {
      segs[ci + 1] = canon;
    }
  }
  if (segs.join("/") !== before) {
    casingRewrites++;
  }
  canonicalPaths[`/${segs.join("/")}`] = methods;
}

spec.paths = canonicalPaths;

// ── Add metadata ──
// NOTE: intentionally no `x-generated-at` timestamp — the committed spec must be a
// deterministic function of the IR so the CI drift gate (git diff) is meaningful.
// "When" lives in git history.
spec["x-generator"] = "manifest-openapi-projection + capsule-post-process";
spec["x-entity-count"] = entityNames.length;
spec["x-command-count"] = ir.commands?.length || 0;

// ── Write output ──
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(spec, null, 2));

// ── Summary ──
const pathCount = Object.keys(fixedPaths).length;
const schemaCount = Object.keys(spec.components?.schemas || {}).length;

console.log(
  `[openapi] Generated spec: ${pathCount} paths, ${schemaCount} schemas`
);
console.log(
  `[openapi] Entities: ${entityNames.length}, Commands: ${ir.commands?.length || 0}`
);
console.log(
  `[openapi] Path rewrites: ${listRewrites} list fixes, ${commandRewrites} command fixes`
);
console.log(`[openapi] Output: ${OUT_JSON}`);
