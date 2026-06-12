import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IR, IRDiagnostic } from "@angriff36/manifest/ir";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "../ir-contract";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MANIFESTS_DIR = join(__dirname, "..", "..", "manifests");

// ============ Manifest Sources ============

/**
 * Load prep task manifest source from file
 */
function loadPrepTaskManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "prep-task-rules.manifest"), "utf-8");
}

/**
 * Load station manifest source from file
 */
function loadStationManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "station-rules.manifest"), "utf-8");
}

/**
 * Load inventory manifest source from file
 */
function loadInventoryManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "inventory-rules.manifest"), "utf-8");
}

/**
 * Load recipe manifest source from file
 */
function loadRecipeManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "recipe-rules.manifest"), "utf-8");
}

/**
 * Load menu manifest source from file
 */
function loadMenuManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "menu-rules.manifest"), "utf-8");
}

/**
 * Load prep list manifest source from file
 */
function loadPrepListManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "prep-list-rules.manifest"), "utf-8");
}

// Cached compiled IR for each manifest
let cachedPrepTaskIR: IR | null = null;
let cachedStationIR: IR | null = null;
let cachedInventoryIR: IR | null = null;
let cachedRecipeIR: IR | null = null;
let cachedMenuIR: IR | null = null;
let cachedPrepListIR: IR | null = null;

/**
 * Compile and cache the PrepTask manifest IR
 */
export async function loadPrepTaskManifestIR(): Promise<IR> {
  if (cachedPrepTaskIR) {
    return cachedPrepTaskIR;
  }

  const manifestSource = loadPrepTaskManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile PrepTask manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedPrepTaskIR = enforceCommandOwnership(ir);
  return cachedPrepTaskIR;
}

/**
 * Compile and cache the Station manifest IR
 */
export async function loadStationManifestIR(): Promise<IR> {
  if (cachedStationIR) {
    return cachedStationIR;
  }

  const manifestSource = loadStationManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile Station manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedStationIR = enforceCommandOwnership(ir);
  return cachedStationIR;
}

/**
 * Compile and cache the Inventory manifest IR
 */
export async function loadInventoryManifestIR(): Promise<IR> {
  if (cachedInventoryIR) {
    return cachedInventoryIR;
  }

  const manifestSource = loadInventoryManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile Inventory manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedInventoryIR = enforceCommandOwnership(ir);
  return cachedInventoryIR;
}

/**
 * Compile and cache the Recipe manifest IR
 */
export async function loadRecipeManifestIR(): Promise<IR> {
  if (cachedRecipeIR) {
    return cachedRecipeIR;
  }

  const manifestSource = loadRecipeManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile Recipe manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedRecipeIR = enforceCommandOwnership(ir);
  return cachedRecipeIR;
}

/**
 * Compile and cache the Menu manifest IR
 */
export async function loadMenuManifestIR(): Promise<IR> {
  if (cachedMenuIR) {
    return cachedMenuIR;
  }

  const manifestSource = loadMenuManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile Menu manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedMenuIR = enforceCommandOwnership(ir);
  return cachedMenuIR;
}

/**
 * Compile and cache the PrepList manifest IR
 */
export async function loadPrepListManifestIR(): Promise<IR> {
  if (cachedPrepListIR) {
    return cachedPrepListIR;
  }

  const manifestSource = loadPrepListManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile PrepList manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedPrepListIR = enforceCommandOwnership(ir);
  return cachedPrepListIR;
}
