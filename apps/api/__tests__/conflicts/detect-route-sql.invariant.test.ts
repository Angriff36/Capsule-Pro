import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTE_PATH = resolve(
  process.cwd(),
  "app/api/conflicts/detect/route.ts"
);

describe("conflicts detect SQL wiring", () => {
  it("uses tenant_staff.employees name fields instead of public.users.name", async () => {
    const content = await readFile(ROUTE_PATH, "utf8");

    expect(content).toContain("tenant_staff.employees");
    expect(content).not.toContain("JOIN public.users");
    expect(content).not.toContain("e.name as employee_name");
  });
});
