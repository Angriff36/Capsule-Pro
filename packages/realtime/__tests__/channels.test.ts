/**
 * Unit tests for channel naming utilities.
 */

import { describe, it, expect } from "vitest";
import {
  getChannelName,
  getModuleFromEventType,
  parseChannelName,
  isValidTenantChannel,
} from "../src/channels";

describe("getChannelName", () => {
  it("formats tenant channel correctly", () => {
    expect(getChannelName("tenant-abc")).toBe("tenant:tenant-abc");
    expect(getChannelName("123")).toBe("tenant:123");
    expect(getChannelName("tenant-with-dashes")).toBe("tenant:tenant-with-dashes");
  });

  it("throws on empty tenantId", () => {
    expect(() => getChannelName("")).toThrow("tenantId is required");
  });

  it("throws on whitespace-only tenantId", () => {
    expect(() => getChannelName("   ")).toThrow("tenantId is required");
  });

  it("preserves special characters in tenantId", () => {
    expect(getChannelName("tenant_123")).toBe("tenant:tenant_123");
    expect(getChannelName("tenant.123")).toBe("tenant:tenant.123");
  });
});

describe("getModuleFromEventType", () => {
  it("extracts module from eventType", () => {
    expect(getModuleFromEventType("kitchen.task.claimed")).toBe("kitchen");
    expect(getModuleFromEventType("events.board.updated")).toBe("events");
    expect(getModuleFromEventType("staff.shift.created")).toBe("staff");
  });

  it("extracts first part for simple event types", () => {
    expect(getModuleFromEventType("kitchen.claimed")).toBe("kitchen");
    expect(getModuleFromEventType("events.created")).toBe("events");
  });

  it("throws on invalid eventType format (no dots)", () => {
    expect(() => getModuleFromEventType("kitchen")).toThrow(
      "Invalid eventType format: kitchen"
    );
  });

  it("throws on empty eventType", () => {
    expect(() => getModuleFromEventType("")).toThrow(
      "Invalid eventType format: "
    );
  });

  it("handles deeply nested event types", () => {
    expect(getModuleFromEventType("kitchen.tasks.prep.items.added")).toBe(
      "kitchen"
    );
  });
});

describe("parseChannelName", () => {
  it("parses valid tenant channel", () => {
    expect(parseChannelName("tenant:abc-123")).toEqual({ tenantId: "abc-123" });
    expect(parseChannelName("tenant:tenant-abc")).toEqual({
      tenantId: "tenant-abc",
    });
  });

  it("returns null for non-tenant channels", () => {
    expect(parseChannelName("kitchen:abc-123")).toBeNull();
    expect(parseChannelName("events:tenant-123")).toBeNull();
    expect(parseChannelName("invalid-channel")).toBeNull();
  });

  it("returns null for malformed tenant channels", () => {
    expect(parseChannelName("tenant:")).toBeNull();
    expect(parseChannelName("tenant")).toBeNull();
  });

  it("extracts complex tenant IDs", () => {
    expect(parseChannelName("tenant:tenant_123-abc")).toEqual({
      tenantId: "tenant_123-abc",
    });
  });
});

describe("isValidTenantChannel", () => {
  it("returns true for valid tenant channels", () => {
    expect(isValidTenantChannel("tenant:abc-123")).toBe(true);
    expect(isValidTenantChannel("tenant:tenant_abc")).toBe(true);
    expect(isValidTenantChannel("tenant:123")).toBe(true);
  });

  it("returns false for non-tenant channels", () => {
    expect(isValidTenantChannel("kitchen:abc-123")).toBe(false);
    expect(isValidTenantChannel("events:tenant-123")).toBe(false);
    expect(isValidTenantChannel("invalid-channel")).toBe(false);
  });

  it("returns false for malformed tenant channels", () => {
    expect(isValidTenantChannel("tenant:")).toBe(false);
    expect(isValidTenantChannel("tenant")).toBe(false);
    expect(isValidTenantChannel(":abc-123")).toBe(false);
  });

  it("rejects channels with multiple colons (module channels - Phase 2)", () => {
    expect(isValidTenantChannel("tenant:abc-123:kitchen")).toBe(false);
  });
});
