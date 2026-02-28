import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTES_ROOT = resolve(process.cwd(), "app/api");

async function collectRouteFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectRouteFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

describe("manifest routes runtime", () => {
  it(
    "enforces nodejs runtime for routes that create manifest runtimes",
    { timeout: 30_000 },
    async () => {
      const routeFiles = await collectRouteFiles(ROUTES_ROOT);

      const manifestRouteFiles: string[] = [];
      for (const routeFile of routeFiles) {
        const content = await readFile(routeFile, "utf8");
        if (content.includes("createManifestRuntime")) {
          manifestRouteFiles.push(routeFile);
          expect(content).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/);
          expect(content).not.toContain('export const runtime = "edge"');
          expect(content).not.toContain("export const runtime = 'edge'");
        }
      }

      expect(manifestRouteFiles.length).toBeGreaterThan(0);
    }
  );
});
