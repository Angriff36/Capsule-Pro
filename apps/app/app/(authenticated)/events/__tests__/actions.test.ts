import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as tenantModule from "../../../lib/tenant";

describe("createEvent validation", () => {
  const mockTenantId = "test-tenant-id";
  const mockFormData = new FormData();

  // createEvent resolves the actor via requireCurrentUser() BEFORE validation
  // (it needs user.id/role to dispatch the governed BattleBoard.create command).
  // Stub it so the validation-error paths under test are reachable without a
  // live Clerk session. The governed command itself is never hit here — every
  // case returns at schema validation, before any create.
  const mockCurrentUser = {
    id: "test-user-id",
    tenantId: mockTenantId,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  beforeEach(() => {
    vi.spyOn(tenantModule, "requireCurrentUser").mockResolvedValue(
      mockCurrentUser
    );

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

  it("returns error when title is missing", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.delete("title");
    mockFormData.set("title", "");

    const { createEvent } = await import("../actions");
    const result = await createEvent(null, mockFormData);
    expect(result).toHaveProperty("error");
    expect(result?.error).toMatch(/Validation failed/);
  }, 15_000);

  it("returns error when title is only whitespace", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("title", "   ");

    const { createEvent } = await import("../actions");
    const result = await createEvent(null, mockFormData);
    expect(result).toHaveProperty("error");
    expect(result?.error).toMatch(/Validation failed/);
  });

  it("returns error when eventDate is missing", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.delete("eventDate");
    mockFormData.set("eventDate", "");

    const { createEvent } = await import("../actions");
    const result = await createEvent(null, mockFormData);
    expect(result).toHaveProperty("error");
    expect(result?.error).toMatch(/Validation failed/);
  });

  it("returns error when guestCount is less than 1", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("guestCount", "0");

    const { createEvent } = await import("../actions");
    const result = await createEvent(null, mockFormData);
    expect(result).toHaveProperty("error");
    expect(result?.error).toMatch(/Validation failed/);
  });

  it("returns error when guestCount is negative", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("guestCount", "-5");

    const { createEvent } = await import("../actions");
    const result = await createEvent(null, mockFormData);
    expect(result).toHaveProperty("error");
    expect(result?.error).toMatch(/Validation failed/);
  });

  it("returns error when budget is negative", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("budget", "-1000");

    const { createEvent } = await import("../actions");
    const result = await createEvent(null, mockFormData);
    expect(result).toHaveProperty("error");
    expect(result?.error).toMatch(/Validation failed/);
  });

  it("returns error with invalid status value", async () => {
    vi.spyOn(tenantModule, "requireTenantId").mockResolvedValue(mockTenantId);

    mockFormData.set("status", "invalid-status");

    const { createEvent } = await import("../actions");
    const result = await createEvent(null, mockFormData);
    expect(result).toHaveProperty("error");
    expect(result?.error).toMatch(/Validation failed/);
  });
});
