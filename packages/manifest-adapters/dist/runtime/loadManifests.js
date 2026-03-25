import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "../ir-contract.js";
const MANIFEST_EXTENSION_RE = /\.manifest$/;
/**
 * Walk up from startDir until pnpm-workspace.yaml is found.
 * Returns the directory containing pnpm-workspace.yaml (the monorepo root).
 *
 * This is necessary because Next.js sets process.cwd() to the app directory
 * (e.g. apps/api), not the monorepo root. Any path resolved off process.cwd()
 * will silently point into a void when the server starts from apps/api.
 */
function findRepoRoot(startDir) {
    let dir = startDir;
    while (true) {
        if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
            return dir;
        }
        const parent = resolve(dir, "..");
        if (parent === dir) {
            // In serverless bundles (e.g. Vercel), pnpm-workspace.yaml is often not
            // present in /var/task even though compiled assets are available. Fall
            // back to startDir and let downstream path resolution try common roots.
            return startDir;
        }
        dir = parent;
    }
}
/**
 * Resolve the manifests directory to an absolute path.
 *
 * If manifestsDir is already absolute, use it as-is (supports tests that
 * pass temp dirs). If it is relative, resolve it from the monorepo root
 * (not process.cwd()) so the path is stable regardless of which directory
 * Next.js started the server from.
 */
function resolveManifestsDir(manifestsDir) {
    const rel = manifestsDir ?? "packages/manifest-adapters/manifests";
    // Already absolute — caller knows what they want (e.g. test fixtures).
    if (resolve(rel) === rel) {
        return rel;
    }
    const repoRoot = findRepoRoot(process.cwd());
    return resolve(repoRoot, rel);
}
const loadedManifestCache = new Map();
const compiledBundleCache = new Map();
function getCacheKey(manifestsDir) {
    return resolve(manifestsDir);
}
function computeManifestHash(files) {
    const hasher = createHash("sha256");
    for (const file of files) {
        hasher.update(file.name);
        hasher.update("\0");
        hasher.update(file.content);
    }
    return hasher.digest("hex");
}
function validateNoDuplicates(compiledIRs, manifestFiles) {
    const errors = [];
    const entities = [];
    const commands = [];
    const events = [];
    const policies = [];
    for (let i = 0; i < compiledIRs.length; i++) {
        const ir = compiledIRs[i];
        const sourceFile = manifestFiles[i];
        for (const entity of ir.entities || []) {
            entities.push({ name: entity.name, source: sourceFile });
        }
        for (const command of ir.commands || []) {
            commands.push({
                name: command.name,
                entity: command.entity || "",
                source: sourceFile,
            });
        }
        for (const event of ir.events || []) {
            events.push({ channel: event.channel, source: sourceFile });
        }
        for (const policy of ir.policies || []) {
            policies.push({ name: policy.name, source: sourceFile });
        }
    }
    const entityNames = new Map();
    for (const { name, source } of entities) {
        if (!entityNames.has(name)) {
            entityNames.set(name, []);
        }
        entityNames.get(name)?.push(source);
    }
    for (const [name, sources] of entityNames) {
        if (sources.length > 1) {
            errors.push(`Duplicate entity "${name}" found in ${sources.join(", ")}`);
        }
    }
    const commandKeys = new Map();
    for (const { name, entity, source } of commands) {
        const key = `${entity}.${name}`;
        if (!commandKeys.has(key)) {
            commandKeys.set(key, []);
        }
        commandKeys.get(key)?.push(source);
    }
    for (const [key, sources] of commandKeys) {
        if (sources.length > 1) {
            errors.push(`Duplicate command "${key}" found in ${sources.join(", ")}`);
        }
    }
    const eventChannels = new Map();
    for (const { channel, source } of events) {
        if (!eventChannels.has(channel)) {
            eventChannels.set(channel, []);
        }
        eventChannels.get(channel)?.push(source);
    }
    for (const [channel, sources] of eventChannels) {
        if (sources.length > 1) {
            errors.push(`Duplicate event channel "${channel}" found in ${sources.join(", ")}`);
        }
    }
    const policyNames = new Map();
    for (const { name, source } of policies) {
        if (!policyNames.has(name)) {
            policyNames.set(name, []);
        }
        policyNames.get(name)?.push(source);
    }
    for (const [name, sources] of policyNames) {
        if (sources.length > 1) {
            errors.push(`Duplicate policy "${name}" found in ${sources.join(", ")}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
async function readManifestFilesFromDisk(manifestsDir) {
    const dirEntries = await readdir(manifestsDir, { withFileTypes: true });
    const manifestNames = dirEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".manifest"))
        .map((entry) => entry.name)
        .sort();
    const files = await Promise.all(manifestNames.map(async (name) => ({
        name,
        content: await readFile(join(manifestsDir, name), "utf-8"),
    })));
    return {
        files,
        hash: computeManifestHash(files),
    };
}
export async function loadManifests(options = {}) {
    const manifestsDir = resolveManifestsDir(options.manifestsDir);
    const cacheKey = getCacheKey(manifestsDir);
    if (!options.forceReload) {
        const cached = loadedManifestCache.get(cacheKey);
        if (cached) {
            return cached;
        }
    }
    const pending = readManifestFilesFromDisk(manifestsDir);
    loadedManifestCache.set(cacheKey, pending);
    return pending;
}
async function compileManifestSet(manifests) {
    const compiledIRs = [];
    for (const file of manifests.files) {
        const { ir, diagnostics } = await compileToIR(file.content);
        if (!ir) {
            const messages = diagnostics
                .map((d) => d.message)
                .join(", ");
            throw new Error(`Failed to compile ${file.name}: ${messages}`);
        }
        const manifestName = file.name.replace(MANIFEST_EXTENSION_RE, "");
        compiledIRs.push(enforceCommandOwnership(ir, manifestName));
    }
    const manifestNames = manifests.files.map((file) => file.name);
    const { valid, errors } = validateNoDuplicates(compiledIRs, manifestNames);
    if (!valid) {
        throw new Error(`Duplicate name validation failed: ${errors.join(" | ")}`);
    }
    const mergedIR = {
        version: "1.0",
        provenance: {
            contentHash: manifests.hash,
            irHash: "",
            compilerVersion: "0.3.8",
            schemaVersion: "1.0",
            // Fixed timestamp keeps output deterministic for identical inputs.
            compiledAt: "1970-01-01T00:00:00.000Z",
        },
        modules: compiledIRs.flatMap((ir) => ir.modules || []),
        entities: compiledIRs.flatMap((ir) => ir.entities || []),
        stores: compiledIRs.flatMap((ir) => ir.stores || []),
        events: compiledIRs.flatMap((ir) => ir.events || []),
        commands: compiledIRs.flatMap((ir) => ir.commands || []),
        policies: compiledIRs.flatMap((ir) => ir.policies || []),
    };
    return {
        files: manifests.files,
        hash: manifests.hash,
        ir: mergedIR,
    };
}
export async function getCompiledManifestBundle(options = {}) {
    const manifests = await loadManifests(options);
    const compileCacheKey = `${getCacheKey(resolveManifestsDir(options.manifestsDir))}:${manifests.hash}`;
    if (!options.forceRecompile) {
        const cached = compiledBundleCache.get(compileCacheKey);
        if (cached) {
            return cached;
        }
    }
    const pending = compileManifestSet(manifests);
    compiledBundleCache.set(compileCacheKey, pending);
    return pending;
}
// ---------------------------------------------------------------------------
// Precompiled IR loader — avoids runtime compilation entirely.
// Use this in production route handlers where the IR is already built.
// ---------------------------------------------------------------------------
let cachedPrecompiledBundle = null;
let cachedPrecompiledPath = "";
/**
 * Load a precompiled IR JSON file and return it as a CompiledManifestBundle.
 *
 * The irPath is resolved relative to the monorepo root (not process.cwd()),
 * so it works correctly when Next.js runs from apps/api.
 *
 * @param irPath - Repo-root-relative path to the precompiled IR JSON.
 *   Example: "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
 */
export function loadPrecompiledIR(irPath) {
    // MCP/Cursor may spawn with cwd = home dir; use explicit root when set
    const repoRoot = process.env.MCP_PROJECT_ROOT ??
        process.env.REPO_ROOT ??
        findRepoRoot(process.cwd());
    const candidates = [
        resolve(repoRoot, irPath),
        resolve(process.cwd(), irPath),
        resolve("/var/task", irPath),
    ];
    const absPath = candidates.find((p) => existsSync(p));
    if (cachedPrecompiledBundle && absPath && cachedPrecompiledPath === absPath) {
        return cachedPrecompiledBundle;
    }
    if (!absPath) {
        throw new Error("[loadManifests] Precompiled IR not found. Tried:\n" +
            candidates.map((c) => `  - ${c}`).join("\n") +
            `\n  irPath: ${irPath}\n` +
            `  repoRoot: ${repoRoot}\n` +
            `  process.cwd(): ${process.cwd()}`);
    }
    const ir = JSON.parse(readFileSync(absPath, "utf8"));
    const hash = createHash("sha256").update(readFileSync(absPath)).digest("hex");
    const bundle = {
        files: [],
        hash,
        ir,
    };
    cachedPrecompiledBundle = bundle;
    cachedPrecompiledPath = absPath;
    return bundle;
}
