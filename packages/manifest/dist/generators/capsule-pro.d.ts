/**
 * Capsule-Pro Projection Generator
 *
 * This generator emits Next.js App Router route handlers for Manifest entities.
 * It's an application-specific projection for Capsule-Pro that:
 * - Uses existing PrismaStore adapters (no new store code)
 * - Uses existing auth/context helpers (no new auth code)
 * - Uses existing response utilities (no new response types)
 *
 * @see .specify/memory/CAPSULE_PRO_MANIFEST_PROJECTION.md for contract
 */
import type { IR } from "../manifest/ir";
/**
 * Route operation types supported by the generator
 */
export interface RouteOperation {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  operation: "list" | "get" | "create" | "update" | "delete" | "command";
}
/**
 * Generator options
 */
export interface CapsuleProGeneratorOptions {
  /** Entity name to generate routes for */
  entityName: string;
  /** Operations to generate */
  operations: RouteOperation[];
  /** Source manifest file path (for provenance) */
  sourceManifest?: string;
}
/**
 * Generate Next.js App Router route handler code
 *
 * @param ir - Manifest intermediate representation
 * @param options - Generator options
 * @returns Generated route handler code
 */
export declare function generateCapsuleProRouteHandler(
  ir: IR,
  options: CapsuleProGeneratorOptions
): string;
//# sourceMappingURL=capsule-pro.d.ts.map
