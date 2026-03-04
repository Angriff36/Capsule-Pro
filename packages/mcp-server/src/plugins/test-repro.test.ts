/**
 * Tests for test-repro.ts — regex patterns for parsing vitest output.
 *
 * Tests the invariant: "Test output parsing correctly extracts pass/fail/skip
 * counts and failure details from vitest output."
 *
 * Since the regex patterns are module-level constants, we replicate them here
 * for testing. This tests the PATTERNS, not the module integration.
 */

import { describe, expect, it } from "vitest";

// Replicate the regex patterns from test-repro.ts
const PASSED_PATTERN = /(\d+)\s+passed/i;
const FAILED_PATTERN = /(\d+)\s+failed/i;
const SKIPPED_PATTERN = /(\d+)\s+skipped/i;
const FAILURE_PATTERN =
  /\n\s*FAIL\s+(.+?)\n([\s\S]*?)(?=\n\s*(FAIL|PASS|Test Files|Tests|Ran|$))/g;

// ---------------------------------------------------------------------------
// Count extraction patterns
// ---------------------------------------------------------------------------

describe("PASSED_PATTERN", () => {
  it("extracts passed count from typical vitest output", () => {
    const output = "Tests  374 passed (374)";
    const match = output.match(PASSED_PATTERN);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("374");
  });

  it("extracts passed count from mixed output", () => {
    const output = "Tests  7 failed | 17 passed (24)";
    const match = output.match(PASSED_PATTERN);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("17");
  });

  it("handles single digit counts", () => {
    const output = "Tests  1 passed";
    const match = output.match(PASSED_PATTERN);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("1");
  });

  it("returns null when no passed count", () => {
    const output = "Tests  5 failed";
    const match = output.match(PASSED_PATTERN);
    expect(match).toBeNull();
  });
});

describe("FAILED_PATTERN", () => {
  it("extracts failed count from typical vitest output", () => {
    const output = "Tests  7 failed | 17 passed (24)";
    const match = output.match(FAILED_PATTERN);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("7");
  });

  it("returns null when no failures", () => {
    const output = "Tests  24 passed (24)";
    const match = output.match(FAILED_PATTERN);
    expect(match).toBeNull();
  });
});

describe("SKIPPED_PATTERN", () => {
  it("extracts skipped count", () => {
    const output = "Tests  3 skipped | 21 passed (24)";
    const match = output.match(SKIPPED_PATTERN);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("3");
  });

  it("returns null when no skipped tests", () => {
    const output = "Tests  24 passed (24)";
    const match = output.match(SKIPPED_PATTERN);
    expect(match).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Failure extraction pattern
// ---------------------------------------------------------------------------

describe("FAILURE_PATTERN", () => {
  it("extracts failure details from vitest output", () => {
    const output = `
 FAIL  src/lib/auth.test.ts
  AssertionError: expected null to be truthy
    at Object.<anonymous> (src/lib/auth.test.ts:42:5)

 PASS  src/lib/command-policy.test.ts
Test Files  1 failed | 1 passed (2)`;

    FAILURE_PATTERN.lastIndex = 0;
    const match = FAILURE_PATTERN.exec(output);
    expect(match).not.toBeNull();
    expect(match![1].trim()).toBe("src/lib/auth.test.ts");
    expect(match![2]).toContain("AssertionError");
  });

  it("extracts multiple failures", () => {
    const output = `
 FAIL  src/lib/auth.test.ts
  Error: test 1 failed

 FAIL  src/lib/database.test.ts
  Error: test 2 failed

Test Files  2 failed (2)`;

    FAILURE_PATTERN.lastIndex = 0;
    const failures: string[] = [];
    let match = FAILURE_PATTERN.exec(output);
    while (match !== null) {
      failures.push(match[1].trim());
      match = FAILURE_PATTERN.exec(output);
    }

    expect(failures).toHaveLength(2);
    expect(failures).toContain("src/lib/auth.test.ts");
    expect(failures).toContain("src/lib/database.test.ts");
  });

  it("returns no matches when all tests pass", () => {
    const output = `
 PASS  src/lib/auth.test.ts
 PASS  src/lib/database.test.ts
Test Files  2 passed (2)`;

    FAILURE_PATTERN.lastIndex = 0;
    const match = FAILURE_PATTERN.exec(output);
    expect(match).toBeNull();
  });
});
