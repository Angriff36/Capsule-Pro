import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../../..");

const migratedFiles = [
  "apps/app/app/(authenticated)/logistics/drivers/page.tsx",
  "apps/app/app/(authenticated)/logistics/vehicles/page.tsx",
  "apps/app/app/(authenticated)/facilities/page.tsx",
  "apps/app/app/(authenticated)/facilities/areas/page.tsx",
  "apps/app/app/(authenticated)/facilities/assets/page.tsx",
  "apps/app/app/(authenticated)/facilities/schedules/page.tsx",
  "apps/app/app/(mobile-kitchen)/kitchen/mobile/my-work/page.tsx",
  "apps/app/app/(authenticated)/notifications/notifications-client.tsx",
  "apps/app/app/(authenticated)/payroll/direct-deposit/page.tsx",
  "apps/app/app/(authenticated)/procurement/budget/page.tsx",
  "apps/app/app/(authenticated)/procurement/vendors/page.tsx",
  "apps/app/app/(authenticated)/crm/pipeline/components/pipeline-board.tsx",
  "apps/app/app/(authenticated)/kitchen/equipment/equipment-page-client.tsx",
  "apps/app/app/lib/leads.ts",
];

describe("manifest generated client adoption (14 migrated files)", () => {
  it("keeps migrated frontend pages from calling Manifest command URLs directly", () => {
    const offenders = migratedFiles.flatMap((file) => {
      const source = readFileSync(resolve(repoRoot, file), "utf8");
      return source.includes("/api/manifest/") ? [file] : [];
    });

    expect(offenders).toEqual([]);
  });
});
