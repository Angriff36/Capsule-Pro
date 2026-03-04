/**
 * Tests for governance-scanners.ts — regex patterns for bypass detection.
 *
 * Tests the invariant: "Governance scanner regex patterns correctly identify
 * bypass patterns in source code."
 *
 * Since the patterns are module-level constants, we replicate them here
 * for testing. This tests the PATTERNS, not the file scanning integration.
 */

import { describe, expect, it } from "vitest";

// Replicate the regex patterns from governance-scanners.ts
const DIRECT_DB_ACCESS_PATTERN =
  /prisma\.(user|prepTask|event|recipe)\.(create|update|delete|findMany)\(/i;
const DIRECT_UPDATE_PATTERN = /\.update\(\s*\{\s*data\s*:/i;
const DIRECT_DELETE_PATTERN = /\.delete\(\s*\{\s*where\s*:/i;
const HARDCODED_TENANT_PATTERN = /tenantId\s*[:=]\s*["']test-tenant["']/i;
const HARDCODED_USER_PATTERN = /userId\s*[:=]\s*["']test-user["']/i;
const AUTH_DISABLED_PATTERN = /auth\s*[:=]\s*(false|0|null)/i;

// ---------------------------------------------------------------------------
// DIRECT_DB_ACCESS_PATTERN
// ---------------------------------------------------------------------------

describe("DIRECT_DB_ACCESS_PATTERN", () => {
  it("matches direct Prisma create calls", () => {
    expect(DIRECT_DB_ACCESS_PATTERN.test("await prisma.user.create({")).toBe(
      true
    );
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.prepTask.create({")).toBe(
      true
    );
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.event.create({")).toBe(true);
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.recipe.create({")).toBe(true);
  });

  it("matches direct Prisma update calls", () => {
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.user.update({")).toBe(true);
  });

  it("matches direct Prisma delete calls", () => {
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.event.delete({")).toBe(true);
  });

  it("matches direct Prisma findMany calls", () => {
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.recipe.findMany({")).toBe(
      true
    );
  });

  it("does not match non-listed models", () => {
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.inventory.create({")).toBe(
      false
    );
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.schedule.update({")).toBe(
      false
    );
  });

  it("does not match non-listed operations", () => {
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.user.findFirst({")).toBe(
      false
    );
    expect(DIRECT_DB_ACCESS_PATTERN.test("prisma.user.findUnique({")).toBe(
      false
    );
  });

  it("is case-insensitive", () => {
    expect(DIRECT_DB_ACCESS_PATTERN.test("Prisma.User.Create({")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DIRECT_UPDATE_PATTERN
// ---------------------------------------------------------------------------

describe("DIRECT_UPDATE_PATTERN", () => {
  it("matches .update({ data: pattern", () => {
    expect(DIRECT_UPDATE_PATTERN.test(".update({ data:")).toBe(true);
    expect(DIRECT_UPDATE_PATTERN.test(".update({  data :")).toBe(true);
    expect(DIRECT_UPDATE_PATTERN.test(".update({\n  data:")).toBe(true);
  });

  it("does not match .update without data", () => {
    expect(DIRECT_UPDATE_PATTERN.test(".update({ where:")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DIRECT_DELETE_PATTERN
// ---------------------------------------------------------------------------

describe("DIRECT_DELETE_PATTERN", () => {
  it("matches .delete({ where: pattern", () => {
    expect(DIRECT_DELETE_PATTERN.test(".delete({ where:")).toBe(true);
    expect(DIRECT_DELETE_PATTERN.test(".delete({  where :")).toBe(true);
  });

  it("does not match .delete without where", () => {
    expect(DIRECT_DELETE_PATTERN.test(".delete({ id:")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HARDCODED_TENANT_PATTERN
// ---------------------------------------------------------------------------

describe("HARDCODED_TENANT_PATTERN", () => {
  it("matches hardcoded tenant IDs", () => {
    expect(HARDCODED_TENANT_PATTERN.test('tenantId: "test-tenant"')).toBe(true);
    expect(HARDCODED_TENANT_PATTERN.test("tenantId = 'test-tenant'")).toBe(
      true
    );
    expect(HARDCODED_TENANT_PATTERN.test('tenantId: "test-tenant"')).toBe(true);
  });

  it("does not match dynamic tenant IDs", () => {
    expect(HARDCODED_TENANT_PATTERN.test("tenantId: identity.tenantId")).toBe(
      false
    );
    expect(HARDCODED_TENANT_PATTERN.test('tenantId: "real-tenant-id"')).toBe(
      false
    );
  });
});

// ---------------------------------------------------------------------------
// HARDCODED_USER_PATTERN
// ---------------------------------------------------------------------------

describe("HARDCODED_USER_PATTERN", () => {
  it("matches hardcoded user IDs", () => {
    expect(HARDCODED_USER_PATTERN.test('userId: "test-user"')).toBe(true);
    expect(HARDCODED_USER_PATTERN.test("userId = 'test-user'")).toBe(true);
  });

  it("does not match dynamic user IDs", () => {
    expect(HARDCODED_USER_PATTERN.test("userId: identity.userId")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AUTH_DISABLED_PATTERN
// ---------------------------------------------------------------------------

describe("AUTH_DISABLED_PATTERN", () => {
  it("matches auth disabled patterns", () => {
    expect(AUTH_DISABLED_PATTERN.test("auth: false")).toBe(true);
    expect(AUTH_DISABLED_PATTERN.test("auth = false")).toBe(true);
    expect(AUTH_DISABLED_PATTERN.test("auth: 0")).toBe(true);
    expect(AUTH_DISABLED_PATTERN.test("auth: null")).toBe(true);
  });

  it("does not match auth enabled", () => {
    expect(AUTH_DISABLED_PATTERN.test("auth: true")).toBe(false);
    expect(AUTH_DISABLED_PATTERN.test("auth = true")).toBe(false);
  });
});
