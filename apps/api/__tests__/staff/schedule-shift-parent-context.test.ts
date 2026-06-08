/**
 * ScheduleShift parent-context contract.
 *
 * Proves at the IR level that creating a schedule shift does NOT require
 * the caller to supply the parent Schedule's locationId — it is inherited
 * server-side via parent-context propagation. The create command accepts
 * only shift-specific input + the scheduleId link.
 *
 * WHY this is a real test: it reads the COMPILED IR, so if someone adds
 * `locationId` as a required create param (forcing the form to ask for the
 * schedule's location again) or drops the belongsTo wiring, this fails.
 *
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "..", "manifest", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const schedule = ir.entities.find((e: { name: string }) => e.name === "Schedule");
const shift = ir.entities.find((e: { name: string }) => e.name === "ScheduleShift");
const createCmd = ir.commands.find(
  (c: { entity: string; name: string }) => c.entity === "ScheduleShift" && c.name === "create"
);

describe("ScheduleShift parent-context propagation", () => {
  it("has a belongsTo relationship to Schedule", () => {
    const rel = shift.relationships.find(
      (r: { kind: string; target: string }) => r.kind === "belongsTo" && r.target === "Schedule"
    );
    expect(rel).toBeDefined();
    expect(rel.foreignKey.fields).toContain("scheduleId");
  });

  it("create command does not require locationId as input", () => {
    const params = createCmd.parameters.map((p: { name: string }) => p.name);
    expect(params).not.toContain("locationId");
  });

  it("create command accepts scheduleId as parent linkage", () => {
    const params = createCmd.parameters.map((p: { name: string }) => p.name);
    expect(params).toContain("scheduleId");
  });

  it("declares inheritedContext property", () => {
    const props = new Set(shift.properties.map((p: { name: string }) => p.name));
    expect(props.has("inheritedContext")).toBe(true);
  });

  it("Schedule genuinely owns locationId (the field being inherited)", () => {
    const scheduleProps = new Set(schedule.properties.map((p: { name: string }) => p.name));
    expect(scheduleProps.has("locationId")).toBe(true);
  });
});
