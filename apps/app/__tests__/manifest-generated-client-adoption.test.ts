import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
  "apps/app/app/(dev-console)/dev-console/users/users-client.tsx",
  "apps/app/app/(authenticated)/inventory/pricing-tiers/pricing-tiers-client.tsx",
  "apps/app/app/(authenticated)/kitchen/containers/containers-client.tsx",
  "apps/app/app/(authenticated)/procurement/vendors/[id]/page.tsx",
  "apps/app/app/(authenticated)/crm/clients/new/page.tsx",
  "apps/app/app/(authenticated)/tools/autofill-reports/autofill-reports-client.tsx",
];

describe("manifest generated client adoption (20 migrated files)", () => {
  it("keeps migrated frontend pages from calling Manifest command URLs directly", () => {
    const missing = migratedFiles.filter(
      (file) => !existsSync(resolve(repoRoot, file))
    );
    expect(missing, `files not found: ${missing.join(", ")}`).toEqual([]);

    const offenders = migratedFiles.flatMap((file) => {
      const source = readFileSync(resolve(repoRoot, file), "utf8");
      return source.includes("/api/manifest/") ? [file] : [];
    });

    expect(offenders).toEqual([]);
  });
});
