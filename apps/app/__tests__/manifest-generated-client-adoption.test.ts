import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../../..");

const migratedFiles = [
  "apps/app/app/(authenticated)/logistics/drivers/page.tsx",
  "apps/app/app/(authenticated)/logistics/vehicles/page.tsx",
];

describe("manifest generated client adoption", () => {
  it("keeps migrated frontend pages from calling Manifest command URLs directly", () => {
    const offenders = migratedFiles.flatMap((file) => {
      const source = readFileSync(resolve(repoRoot, file), "utf8");
      return source.includes("/api/manifest/") ? [file] : [];
    });

    expect(offenders).toEqual([]);
  });
});
