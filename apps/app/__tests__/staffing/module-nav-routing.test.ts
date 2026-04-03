import { describe, expect, it } from "vitest";

import {
  getModuleKeyFromPathname,
  modules,
} from "../../app/(authenticated)/components/module-nav";

describe("staffing module routing", () => {
  it("uses /staffing as the module root href", () => {
    const staffingModule = modules.find((module) => module.key === "staffing");

    expect(staffingModule?.href).toBe("/staffing");
  });

  it("keeps staffing paths mapped to the staffing module", () => {
    expect(getModuleKeyFromPathname("/staffing")).toBe("staffing");
    expect(getModuleKeyFromPathname("/staffing/recommendations")).toBe(
      "staffing"
    );
    expect(getModuleKeyFromPathname("/staffing/coverage")).toBe("staffing");
  });
});
