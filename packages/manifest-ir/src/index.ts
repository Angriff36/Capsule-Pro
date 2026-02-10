import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { IR } from "@manifest/runtime/ir";

export const KITCHEN_IR_PATH =
  "packages/manifest-ir/ir/kitchen/kitchen.ir.json";
export const KITCHEN_PROVENANCE_PATH =
  "packages/manifest-ir/ir/kitchen/kitchen.provenance.json";

export function readKitchenIr(cwd = process.cwd()): IR {
  const fullPath = resolve(cwd, KITCHEN_IR_PATH);
  return JSON.parse(readFileSync(fullPath, "utf-8")) as IR;
}

export function readKitchenProvenance(cwd = process.cwd()): IR["provenance"] {
  const fullPath = resolve(cwd, KITCHEN_PROVENANCE_PATH);
  return JSON.parse(readFileSync(fullPath, "utf-8")) as IR["provenance"];
}
