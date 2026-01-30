import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as tenantModule from "../../../lib/tenant";
import * as databaseModule from "@repo/database";

describe("createEvent validation", () => {
  const mockTenantId = "test-tenant-id";
  const mockFormData = new FormData();

  beforeEach(() => {
    mockFormData.delete("title");
    mockFormData.delete("eventType");
    mockFormData.delete("eventDate");
    mockFormData.delete("guestCount");
    mockFormData.delete("status");
    mockFormData.delete("venueName");
    mockFormData.delete("venueAddress");
    mockFormData.delete("notes");
    mockFormData.delete("budget");
    mockFormData.delete("tags");

    mockFormData.set("title", "Test Event");
    mockFormData.set("eventType", "catering");
    mockFormData.set("eventDate", "2024-12-31");
    mockFormData.set("guestCount", "50");
    mockFormData.set("status", "confirmed");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws error when title is missing", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.delete("title");
    mockFormData.set("title", "");

    const { createEvent } = await import("../actions");
    await expect(createEvent(mockFormData)).rejects.toThrow(/Validation failed/);
  });

  it("throws error when title is only whitespace", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("title", "   ");

    const { createEvent } = await import("../actions");
    await expect(createEvent(mockFormData)).rejects.toThrow(/Validation failed/);
  });

  it("throws error when eventDate is missing", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.delete("eventDate");
    mockFormData.set("eventDate", "");

    const { createEvent } = await import("../actions");
    await expect(createEvent(mockFormData)).rejects.toThrow(/Validation failed/);
  });

  it("throws error when guestCount is less than 1", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("guestCount", "0");

    const { createEvent } = await import("../actions");
    await expect(createEvent(mockFormData)).rejects.toThrow(/Validation failed/);
  });

  it("throws error when guestCount is negative", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("guestCount", "-5");

    const { createEvent } = await import("../actions");
    await expect(createEvent(mockFormData)).rejects.toThrow(/Validation failed/);
  });

  it("throws error when budget is negative", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("budget", "-1000");

    const { createEvent } = await import("../actions");
    await expect(createEvent(mockFormData)).rejects.toThrow(/Validation failed/);
  });

  it("throws error with invalid status value", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("status", "invalid-status");

    const { createEvent } = await import("../actions");
    await expect(createEvent(mockFormData)).rejects.toThrow();
  });
});
