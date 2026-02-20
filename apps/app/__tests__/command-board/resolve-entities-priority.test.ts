/**
 * @vitest-environment node
 *
 * Tests for entity resolution priority handling
 *
 * NOTE: This file was consolidated into projection-normalization.test.ts
 * The priority normalization tests are now in that file to avoid
 * issues with server-only module imports.
 */

import { describe, expect, it } from "vitest";

describe("Priority Normalization (consolidated)", () => {
  it("placeholder - tests moved to projection-normalization.test.ts", () => {
    // The actual priority normalization tests are in projection-normalization.test.ts
    // This file is kept as a stub to avoid breaking import paths
    expect(true).toBe(true);
  });
});
