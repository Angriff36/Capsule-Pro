import { describe, expect, it } from "vitest";
import { getCommandsRegistry } from "../commands-registry.js";

describe("commands-registry", () => {
  it("returns a non-empty array", () => {
    const registry = getCommandsRegistry();
    expect(registry).toBeInstanceOf(Array);
    expect(registry.length).toBeGreaterThan(0);
  });

  it("every entry has the required shape", () => {
    const registry = getCommandsRegistry();
    for (const entry of registry) {
      expect(entry).toHaveProperty("entity");
      expect(entry).toHaveProperty("command");
      expect(entry).toHaveProperty("commandId");
      expect(typeof entry.entity).toBe("string");
      expect(typeof entry.command).toBe("string");
      expect(typeof entry.commandId).toBe("string");
      expect(entry.entity.length).toBeGreaterThan(0);
      expect(entry.command.length).toBeGreaterThan(0);
      expect(entry.commandId).toBe(`${entry.entity}.${entry.command}`);
    }
  });

  it("contains known PrepTask commands", () => {
    const registry = getCommandsRegistry();
    const prepTaskCommands = registry
      .filter((e) => e.entity === "PrepTask")
      .map((e) => e.command);
    expect(prepTaskCommands).toContain("claim");
    expect(prepTaskCommands).toContain("complete");
  });

  it("contains high-priority entities", () => {
    const registry = getCommandsRegistry();
    const entities = new Set(registry.map((e) => e.entity));
    expect(entities.has("Event")).toBe(true);
    expect(entities.has("PrepTask")).toBe(true);
    expect(entities.has("Recipe")).toBe(true);
    expect(entities.has("Client")).toBe(true);
  });

  it("has at least 500 entries (coverage gate)", () => {
    const registry = getCommandsRegistry();
    expect(registry.length).toBeGreaterThanOrEqual(500);
  });

  it("commandId is globally unique", () => {
    const registry = getCommandsRegistry();
    const ids = registry.map((e) => e.commandId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
