/**
 * Tests for command-policy.ts — three-tier access policy.
 *
 * Pure logic, zero external dependencies. Tests the invariant:
 * "Every command is in exactly ONE tier. Unlisted commands are DENY."
 */

import { describe, expect, it } from "vitest";
import {
  getAllowedCommands,
  getCommandAccess,
  isCommandAvailable,
} from "./command-policy.js";

// ---------------------------------------------------------------------------
// getCommandAccess
// ---------------------------------------------------------------------------

describe("getCommandAccess", () => {
  it("returns ALLOW for explicitly allowed commands", () => {
    expect(getCommandAccess("PrepTask", "claim")).toBe("ALLOW");
    expect(getCommandAccess("PrepTask", "unclaim")).toBe("ALLOW");
    expect(getCommandAccess("PrepTask", "start")).toBe("ALLOW");
    expect(getCommandAccess("PrepTask", "complete")).toBe("ALLOW");
    expect(getCommandAccess("PrepTask", "release")).toBe("ALLOW");
    expect(getCommandAccess("KitchenTask", "claim")).toBe("ALLOW");
    expect(getCommandAccess("PrepList", "create")).toBe("ALLOW");
    expect(getCommandAccess("ClientInteraction", "create")).toBe("ALLOW");
  });

  it("returns CONFIRM for destructive commands", () => {
    expect(getCommandAccess("Event", "cancel")).toBe("CONFIRM");
    expect(getCommandAccess("Event", "archive")).toBe("CONFIRM");
    expect(getCommandAccess("PurchaseOrder", "cancel")).toBe("CONFIRM");
    expect(getCommandAccess("User", "deactivate")).toBe("CONFIRM");
    expect(getCommandAccess("User", "terminate")).toBe("CONFIRM");
    expect(getCommandAccess("PrepList", "cancel")).toBe("CONFIRM");
    expect(getCommandAccess("CateringOrder", "cancel")).toBe("CONFIRM");
  });

  it("returns DENY for unlisted commands (default)", () => {
    expect(getCommandAccess("PrepTask", "delete")).toBe("DENY");
    expect(getCommandAccess("Event", "create")).toBe("DENY");
    expect(getCommandAccess("NonExistent", "anything")).toBe("DENY");
    expect(getCommandAccess("", "")).toBe("DENY");
  });

  it("is case-sensitive — wrong case returns DENY", () => {
    expect(getCommandAccess("preptask", "claim")).toBe("DENY");
    expect(getCommandAccess("PrepTask", "Claim")).toBe("DENY");
    expect(getCommandAccess("PREPTASK", "CLAIM")).toBe("DENY");
  });
});

// ---------------------------------------------------------------------------
// getAllowedCommands
// ---------------------------------------------------------------------------

describe("getAllowedCommands", () => {
  it("returns a non-empty array", () => {
    const commands = getAllowedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it("every entry has entity, command, and access fields", () => {
    const commands = getAllowedCommands();
    for (const cmd of commands) {
      expect(cmd.entity).toBeTruthy();
      expect(cmd.command).toBeTruthy();
      expect(["ALLOW", "CONFIRM"]).toContain(cmd.access);
    }
  });

  it("does not include DENY entries (only ALLOW and CONFIRM)", () => {
    const commands = getAllowedCommands();
    const denyEntries = commands.filter((c) => c.access === "DENY");
    expect(denyEntries).toHaveLength(0);
  });

  it("includes known ALLOW commands", () => {
    const commands = getAllowedCommands();
    const claimEntry = commands.find(
      (c) => c.entity === "PrepTask" && c.command === "claim"
    );
    expect(claimEntry).toBeDefined();
    expect(claimEntry!.access).toBe("ALLOW");
  });

  it("includes known CONFIRM commands", () => {
    const commands = getAllowedCommands();
    const cancelEntry = commands.find(
      (c) => c.entity === "Event" && c.command === "cancel"
    );
    expect(cancelEntry).toBeDefined();
    expect(cancelEntry!.access).toBe("CONFIRM");
  });

  it("each command appears exactly once (no duplicates)", () => {
    const commands = getAllowedCommands();
    const keys = commands.map((c) => `${c.entity}.${c.command}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});

// ---------------------------------------------------------------------------
// isCommandAvailable
// ---------------------------------------------------------------------------

describe("isCommandAvailable", () => {
  it("returns true for ALLOW commands", () => {
    expect(isCommandAvailable("PrepTask", "claim")).toBe(true);
    expect(isCommandAvailable("PrepList", "create")).toBe(true);
  });

  it("returns true for CONFIRM commands", () => {
    expect(isCommandAvailable("Event", "cancel")).toBe(true);
    expect(isCommandAvailable("User", "deactivate")).toBe(true);
  });

  it("returns false for DENY (unlisted) commands", () => {
    expect(isCommandAvailable("PrepTask", "delete")).toBe(false);
    expect(isCommandAvailable("NonExistent", "anything")).toBe(false);
  });
});
