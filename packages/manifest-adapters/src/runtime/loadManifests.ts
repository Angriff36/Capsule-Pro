import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { IR } from "@angriff36/manifest/ir";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "../ir-contract.js";

export interface ManifestFile {
  name: string;
  content: string;
}

export interface LoadedManifestSet {
  files: ManifestFile[];
  hash: string;
}

export interface CompiledManifestBundle {
  files: ManifestFile[];
  hash: string;
  ir: IR;
}

interface LoadManifestOptions {
  manifestsDir?: string;
  forceReload?: boolean;
}

interface CompileBundleOptions extends LoadManifestOptions {
  forceRecompile?: boolean;
}

const DEFAULT_MANIFESTS_DIR = resolve(
  process.cwd(),
  "packages/manifest-adapters/manifests"
);

const loadedManifestCache = new Map<string, Promise<LoadedManifestSet>>();
const compiledBundleCache = new Map<string, Promise<CompiledManifestBundle>>();

function getCacheKey(manifestsDir: string) {
  return resolve(manifestsDir);
}

function computeManifestHash(files: ManifestFile[]) {
  const hasher = createHash("sha256");
  for (const file of files) {
    hasher.update(file.name);
    hasher.update("\0");
    hasher.update(file.content);
  }
  return hasher.digest("hex");
}

function validateNoDuplicates(compiledIRs: IR[], manifestFiles: string[]) {
  const errors: string[] = [];
  const entities: Array<{ name: string; source: string }> = [];
  const commands: Array<{ name: string; entity: string; source: string }> = [];
  const events: Array<{ channel: string; source: string }> = [];
  const policies: Array<{ name: string; source: string }> = [];

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

  const entityNames = new Map<string, string[]>();
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

  const commandKeys = new Map<string, string[]>();
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

  const eventChannels = new Map<string, string[]>();
  for (const { channel, source } of events) {
    if (!eventChannels.has(channel)) {
      eventChannels.set(channel, []);
    }
    eventChannels.get(channel)?.push(source);
  }
  for (const [channel, sources] of eventChannels) {
    if (sources.length > 1) {
      errors.push(
        `Duplicate event channel "${channel}" found in ${sources.join(", ")}`
      );
    }
  }

  const policyNames = new Map<string, string[]>();
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

async function readManifestFilesFromDisk(
  manifestsDir: string
): Promise<LoadedManifestSet> {
  const dirEntries = await readdir(manifestsDir, { withFileTypes: true });
  const manifestNames = dirEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".manifest"))
    .map((entry) => entry.name)
    .sort();

  const files = await Promise.all(
    manifestNames.map(async (name) => ({
      name,
      content: await readFile(join(manifestsDir, name), "utf-8"),
    }))
  );

  return {
    files,
    hash: computeManifestHash(files),
  };
}

export async function loadManifests(
  options: LoadManifestOptions = {}
): Promise<LoadedManifestSet> {
  const manifestsDir = options.manifestsDir ?? DEFAULT_MANIFESTS_DIR;
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

async function compileManifestSet(
  manifests: LoadedManifestSet
): Promise<CompiledManifestBundle> {
  const compiledIRs: IR[] = [];

  for (const file of manifests.files) {
    const { ir, diagnostics } = await compileToIR(file.content);
    if (!ir) {
      const messages = diagnostics
        .map((d: { message: string }) => d.message)
        .join(", ");
      throw new Error(`Failed to compile ${file.name}: ${messages}`);
    }

    const manifestName = file.name.replace(/\.manifest$/, "");
    compiledIRs.push(enforceCommandOwnership(ir, manifestName));
  }

  const manifestNames = manifests.files.map((file) => file.name);
  const { valid, errors } = validateNoDuplicates(compiledIRs, manifestNames);
  if (!valid) {
    throw new Error(`Duplicate name validation failed: ${errors.join(" | ")}`);
  }

  const mergedIR: IR = {
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

export async function getCompiledManifestBundle(
  options: CompileBundleOptions = {}
): Promise<CompiledManifestBundle> {
  const manifests = await loadManifests(options);
  const compileCacheKey = `${getCacheKey(
    options.manifestsDir ?? DEFAULT_MANIFESTS_DIR
  )}:${manifests.hash}`;

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
