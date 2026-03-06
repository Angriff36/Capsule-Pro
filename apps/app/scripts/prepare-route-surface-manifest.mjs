import { mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const appRoot = resolve(process.cwd());
const targetPath = resolve(appRoot, ".generated", "routes.manifest.json");

const candidates = [
  process.env.ROUTES_MANIFEST_SOURCE,
  resolve(appRoot, "..", "..", "packages", "manifest-ir", "dist", "routes.manifest.json"),
  resolve(appRoot, "packages", "manifest-ir", "dist", "routes.manifest.json"),
].filter(Boolean);

const sourcePath = candidates.find((candidate) => existsSync(candidate));

if (!sourcePath) {
  if (existsSync(targetPath)) {
    console.warn(`[prepare-route-surface] source not found; keeping existing target ${targetPath}`);
    process.exit(0);
  }

  console.error("[prepare-route-surface] Could not find routes.manifest.json source.");
  console.error("Searched:");
  for (const candidate of candidates) {
    console.error(` - ${candidate}`);
  }
  process.exit(1);
}

mkdirSync(dirname(targetPath), { recursive: true });
copyFileSync(sourcePath, targetPath);
console.log(`[prepare-route-surface] copied ${sourcePath} -> ${targetPath}`);
