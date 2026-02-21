import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTE_PATH = resolve(process.cwd(), "apps/api/app/api/conflicts/detect/route.ts");

describe("conflicts detect SQL wiring", () => {
  it("uses tenant_staff.employees name fields instead of public.users.name", async () => {
    const content = await readFile(ROUTE_PATH, "utf8");

    expect(content).toContain("tenant_staff.employees");
    expect(content).not.toContain("JOIN public.users");
    expect(content).not.toContain("e.name as employee_name");
  });

  it("uses typed Prisma.sql for all raw queries (no unsafe string concatenation)", async () => {
    const content = await readFile(ROUTE_PATH, "utf8");

    // Should use Prisma.sql tagged template literals
    expect(content).toContain("Prisma.sql`");

    // Should NOT contain unsafe string interpolation inside Prisma.sql backticks
    // Extract just the Prisma.sql sections and check them
    const prismaSqlSections = content.match(/Prisma\.sql`[^`]*`/gs) || [];

    for (const section of prismaSqlSections) {
      // No string concatenation with + inside Prisma.sql interpolation
      expect(section).not.toMatch(/\$\{[^}]*\+[^}]*\}/);
      // No template literals inside Prisma.sql
      expect(section).not.toContain("`${");
      // No quoted string interpolation that should be parameterized
      expect(section).not.toMatch(/=\s*'[^']*\$\{/);
    }
  });

  it("uses Prisma.join for IN clauses (not string concatenation)", async () => {
    const content = await readFile(ROUTE_PATH, "utf8");

    // IN clauses should use Prisma.join
    expect(content).toContain("Prisma.join(");

    // Should NOT manually construct IN clauses
    expect(content).not.toMatch(/IN\s*\(['"]\s*\$\{/i); // No direct interpolation in IN
    expect(content).not.toMatch(/IN\s*\(['"]\s*\+/i); // No concatenation in IN
  });

  it("filters by tenant_id in all raw queries for tenant isolation", async () => {
    const content = await readFile(ROUTE_PATH, "utf8");

    // All queries should filter by tenant - patterns can be:
    // - tenant_id::text = ${tenantId}
    // - tenant_id = ${tenantId}::uuid
    const textPattern = (content.match(/tenant_id::text\s*=\s*\$\{tenantId\}/g) || [])
      .length;
    const uuidPattern = (content.match(/tenant_id\s*=\s*\$\{tenantId\}::uuid/g) || [])
      .length;
    const totalTenantFilters = textPattern + uuidPattern;

    // Should have tenant filtering in all raw SQL queries
    // There are 5 detectors using raw SQL (scheduling, staff, inventory, venue, equipment, financial)
    // Note: timeline detector uses Prisma ORM (prepTask.findMany), not raw SQL
    expect(totalTenantFilters).toBeGreaterThanOrEqual(5);
  });

  it("handles soft deletes with deleted_at IS NULL checks", async () => {
    const content = await readFile(ROUTE_PATH, "utf8");

    // Should check for soft deletes in joins
    expect(content).toContain("deleted_at IS NULL");
  });

  it("uses CONCAT_WS for employee name construction (not name field)", async () => {
    const content = await readFile(ROUTE_PATH, "utf8");

    // Should use CONCAT_WS for combining first_name and last_name
    expect(content).toContain("CONCAT_WS(' ', e.first_name, e.last_name)");

    // Should NOT use a non-existent name field
    expect(content).not.toContain("e.name");
  });
});
