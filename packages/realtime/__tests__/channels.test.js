/**
 * Unit tests for channel naming utilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const channels_1 = require("../src/channels");
(0, vitest_1.describe)("getChannelName", () => {
  (0, vitest_1.it)("formats tenant channel correctly", () => {
    (0, vitest_1.expect)((0, channels_1.getChannelName)("tenant-abc")).toBe(
      "tenant:tenant-abc"
    );
    (0, vitest_1.expect)((0, channels_1.getChannelName)("123")).toBe(
      "tenant:123"
    );
    (0, vitest_1.expect)(
      (0, channels_1.getChannelName)("tenant-with-dashes")
    ).toBe("tenant:tenant-with-dashes");
  });
  (0, vitest_1.it)("throws on empty tenantId", () => {
    (0, vitest_1.expect)(() => (0, channels_1.getChannelName)("")).toThrow(
      "tenantId is required"
    );
  });
  (0, vitest_1.it)("throws on whitespace-only tenantId", () => {
    (0, vitest_1.expect)(() => (0, channels_1.getChannelName)("   ")).toThrow(
      "tenantId is required"
    );
  });
  (0, vitest_1.it)("preserves special characters in tenantId", () => {
    (0, vitest_1.expect)((0, channels_1.getChannelName)("tenant_123")).toBe(
      "tenant:tenant_123"
    );
    (0, vitest_1.expect)((0, channels_1.getChannelName)("tenant.123")).toBe(
      "tenant:tenant.123"
    );
  });
});
(0, vitest_1.describe)("getModuleFromEventType", () => {
  (0, vitest_1.it)("extracts module from eventType", () => {
    (0, vitest_1.expect)(
      (0, channels_1.getModuleFromEventType)("kitchen.task.claimed")
    ).toBe("kitchen");
    (0, vitest_1.expect)(
      (0, channels_1.getModuleFromEventType)("events.board.updated")
    ).toBe("events");
    (0, vitest_1.expect)(
      (0, channels_1.getModuleFromEventType)("staff.shift.created")
    ).toBe("staff");
  });
  (0, vitest_1.it)("extracts first part for simple event types", () => {
    (0, vitest_1.expect)(
      (0, channels_1.getModuleFromEventType)("kitchen.claimed")
    ).toBe("kitchen");
    (0, vitest_1.expect)(
      (0, channels_1.getModuleFromEventType)("events.created")
    ).toBe("events");
  });
  (0, vitest_1.it)("throws on invalid eventType format (no dots)", () => {
    (0, vitest_1.expect)(() =>
      (0, channels_1.getModuleFromEventType)("kitchen")
    ).toThrow("Invalid eventType format: kitchen");
  });
  (0, vitest_1.it)("throws on empty eventType", () => {
    (0, vitest_1.expect)(() =>
      (0, channels_1.getModuleFromEventType)("")
    ).toThrow("Invalid eventType format: ");
  });
  (0, vitest_1.it)("handles deeply nested event types", () => {
    (0, vitest_1.expect)(
      (0, channels_1.getModuleFromEventType)("kitchen.tasks.prep.items.added")
    ).toBe("kitchen");
  });
});
(0, vitest_1.describe)("parseChannelName", () => {
  (0, vitest_1.it)("parses valid tenant channel", () => {
    (0, vitest_1.expect)(
      (0, channels_1.parseChannelName)("tenant:abc-123")
    ).toEqual({ tenantId: "abc-123" });
    (0, vitest_1.expect)(
      (0, channels_1.parseChannelName)("tenant:tenant-abc")
    ).toEqual({
      tenantId: "tenant-abc",
    });
  });
  (0, vitest_1.it)("returns null for non-tenant channels", () => {
    (0, vitest_1.expect)(
      (0, channels_1.parseChannelName)("kitchen:abc-123")
    ).toBeNull();
    (0, vitest_1.expect)(
      (0, channels_1.parseChannelName)("events:tenant-123")
    ).toBeNull();
    (0, vitest_1.expect)(
      (0, channels_1.parseChannelName)("invalid-channel")
    ).toBeNull();
  });
  (0, vitest_1.it)("returns null for malformed tenant channels", () => {
    (0, vitest_1.expect)(
      (0, channels_1.parseChannelName)("tenant:")
    ).toBeNull();
    (0, vitest_1.expect)((0, channels_1.parseChannelName)("tenant")).toBeNull();
  });
  (0, vitest_1.it)("extracts complex tenant IDs", () => {
    (0, vitest_1.expect)(
      (0, channels_1.parseChannelName)("tenant:tenant_123-abc")
    ).toEqual({
      tenantId: "tenant_123-abc",
    });
  });
});
(0, vitest_1.describe)("isValidTenantChannel", () => {
  (0, vitest_1.it)("returns true for valid tenant channels", () => {
    (0, vitest_1.expect)(
      (0, channels_1.isValidTenantChannel)("tenant:abc-123")
    ).toBe(true);
    (0, vitest_1.expect)(
      (0, channels_1.isValidTenantChannel)("tenant:tenant_abc")
    ).toBe(true);
    (0, vitest_1.expect)(
      (0, channels_1.isValidTenantChannel)("tenant:123")
    ).toBe(true);
  });
  (0, vitest_1.it)("returns false for non-tenant channels", () => {
    (0, vitest_1.expect)(
      (0, channels_1.isValidTenantChannel)("kitchen:abc-123")
    ).toBe(false);
    (0, vitest_1.expect)(
      (0, channels_1.isValidTenantChannel)("events:tenant-123")
    ).toBe(false);
    (0, vitest_1.expect)(
      (0, channels_1.isValidTenantChannel)("invalid-channel")
    ).toBe(false);
  });
  (0, vitest_1.it)("returns false for malformed tenant channels", () => {
    (0, vitest_1.expect)((0, channels_1.isValidTenantChannel)("tenant:")).toBe(
      false
    );
    (0, vitest_1.expect)((0, channels_1.isValidTenantChannel)("tenant")).toBe(
      false
    );
    (0, vitest_1.expect)((0, channels_1.isValidTenantChannel)(":abc-123")).toBe(
      false
    );
  });
  (0, vitest_1.it)(
    "rejects channels with multiple colons (module channels - Phase 2)",
    () => {
      (0, vitest_1.expect)(
        (0, channels_1.isValidTenantChannel)("tenant:abc-123:kitchen")
      ).toBe(false);
    }
  );
});
