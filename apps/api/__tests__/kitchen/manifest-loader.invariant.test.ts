import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import {
  getCompiledManifestBundle,
  loadManifests,
} from "@repo/manifest-runtime/runtime/loadManifests";
import { afterEach, describe, expect, it } from "vitest";

const TMP_PREFIX = join(tmpdir(), "manifest-loader-invariant-");
const FIXTURE_DIR = resolve(process.cwd(), "../../manifest/source");

const tempDirs: string[] = [];

/**
 * Create an isolated fixture layout that mirrors `manifest/source/`:
 *   <tmp>/_base.manifest        ← shared tenant + TenantScoped/SoftDeletable mixins
 *   <tmp>/source/*.manifest     ← domain files under test (manifestsDir)
 *
 * The real domain sources open with `use "../_base.manifest"`. The loader's
 * project compiler (`compileProjectToIR`) resolves that path relative to each
 * entry file's directory, so the domain files MUST live one level below
 * `_base.manifest`. Returning the `source` subdir as `manifestsDir` makes
 * `../_base.manifest` resolve to the copied base — compiler 2.18.6 hard-errors
 * on a missing `_base.manifest` ("File not found: _base.manifest").
 */
async function createFixtureDir() {
  const root = await mkdtemp(TMP_PREFIX);
  tempDirs.push(root);
  const base = await readFile(join(FIXTURE_DIR, "_base.manifest"), "utf8");
  await writeFile(join(root, "_base.manifest"), base, "utf8");
  const manifestsDir = join(root, "source");
  await mkdir(manifestsDir, { recursive: true });
  return manifestsDir;
}

/** Recursively collect every domain `.manifest` path (excluding `_base`). */
async function collectDomainManifests(
  dir: string,
  acc: string[] = []
): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectDomainManifests(full, acc);
    } else if (
      entry.name.endsWith(".manifest") &&
      entry.name !== "_base.manifest"
    ) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Flatten the entire real `manifest/source/` tree (subdirs included) into
 * `manifestsDir`. `loadManifests`/`getCompiledManifestBundle` read a single
 * flat directory (non-recursive), so the domain subdirs must be collapsed.
 *
 * The full set is required because compiler 2.18.6 hard-errors on relationships
 * that target entities defined in sibling files (e.g. menu-rules → `Dish`,
 * station-rules → `Facility`/`PrepTask`/`PrepListItem`). Compiling a small
 * subset in isolation fails "targeting unknown entity"; the complete project
 * resolves every target. Domain `.manifest` basenames are unique across the
 * tree, so flattening is collision-free.
 */
async function populateFullSource(manifestsDir: string) {
  const files = await collectDomainManifests(FIXTURE_DIR);
  await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, "utf8");
      await writeFile(join(manifestsDir, basename(file)), content, "utf8");
    })
  );
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0, tempDirs.length)
      .map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe("manifest loader invariants", () => {
  it("changes hash when a manifest file changes", async () => {
    const dir = await createFixtureDir();
    const fixture = await readFile(
      join(FIXTURE_DIR, "kitchen/menu-rules.manifest"),
      "utf8"
    );
    const targetFile = join(dir, "menu-rules.manifest");

    await writeFile(targetFile, fixture, "utf8");

    const first = await loadManifests({ manifestsDir: dir, forceReload: true });

    await writeFile(targetFile, `${fixture}\n// hash-change`, "utf8");
    const second = await loadManifests({
      manifestsDir: dir,
      forceReload: true,
    });

    expect(first.hash).not.toBe(second.hash);
  });

  it("produces deterministic compiled IR for identical inputs", async () => {
    const dir = await createFixtureDir();
    // Compilation (unlike hashing) cross-validates relationships, so the full
    // project must be present for compiler 2.18.6 to resolve every target.
    await populateFullSource(dir);

    const first = await getCompiledManifestBundle({
      manifestsDir: dir,
      forceReload: true,
      forceRecompile: true,
    });
    const second = await getCompiledManifestBundle({
      manifestsDir: dir,
      forceReload: true,
      forceRecompile: true,
    });

    // The content hash is derived purely from source bytes, so it is the
    // authoritative determinism signal.
    expect(first.hash).toBe(second.hash);

    // The IR itself must be byte-for-byte identical EXCEPT for two volatile
    // provenance fields: `compiledAt` (a wall-clock stamp written on every
    // compile) and `irHash` (derived from `compiledAt`, so it inherits the
    // jitter). Both are provenance metadata, not semantic IR — the meaningful
    // determinism signal is the content hash asserted above. Strip them before
    // the deep-equal so the assertion proves the *semantic* IR is deterministic
    // rather than flaking on the clock.
    const stripVolatileProvenance = (ir: typeof first.ir) => ({
      ...ir,
      provenance: {
        ...ir.provenance,
        compiledAt: undefined,
        irHash: undefined,
      },
    });
    expect(stripVolatileProvenance(first.ir)).toEqual(
      stripVolatileProvenance(second.ir)
    );
  });
});
