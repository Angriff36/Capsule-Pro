import { readFile } from "node:fs/promises";

export const KITCHEN_IR_PATH = new URL(
  "../ir/kitchen/kitchen.ir.json",
  import.meta.url
);
export const KITCHEN_PROVENANCE_PATH = new URL(
  "../ir/kitchen/kitchen.provenance.json",
  import.meta.url
);

export async function readKitchenIR(): Promise<unknown> {
  const content = await readFile(KITCHEN_IR_PATH, "utf8");
  return JSON.parse(content) as unknown;
}

export async function readKitchenIRProvenance(): Promise<unknown> {
  const content = await readFile(KITCHEN_PROVENANCE_PATH, "utf8");
  return JSON.parse(content) as unknown;
}
