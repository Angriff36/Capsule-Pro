import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  getCompiledManifestBundle,
  loadManifests,
} from "@repo/manifest-adapters/runtime/loadManifests";
import { afterEach, describe, expect, it } from "vitest";

const TMP_PREFIX = join(tmpdir(), "manifest-loader-invariant-");
const FIXTURE_DIR = resolve(
  process.cwd(),
  "../../packages/manifest-adapters/manifests"
);

const tempDirs: string[] = [];

async function createFixtureDir() {
  const dir = await mkdtemp(TMP_PREFIX);
  tempDirs.push(dir);
  return dir;
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
      join(FIXTURE_DIR, "menu-rules.manifest"),
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
    const menu = await readFile(
      join(FIXTURE_DIR, "menu-rules.manifest"),
      "utf8"
    );
    const station = await readFile(
      join(FIXTURE_DIR, "station-rules.manifest"),
      "utf8"
    );

    await writeFile(join(dir, "menu-rules.manifest"), menu, "utf8");
    await writeFile(join(dir, "station-rules.manifest"), station, "utf8");

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

    expect(first.hash).toBe(second.hash);
    expect(first.ir).toEqual(second.ir);
  });
});
