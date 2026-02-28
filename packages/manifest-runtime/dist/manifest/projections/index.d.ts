/**
 * Projections module entry point.
 *
 * Projections consume IR and emit platform-specific code.
 * They are NOT part of runtime semantics.
 *
 * The registry auto-registers builtins on first access, so consumers
 * can simply call getProjection(name) without manual initialization.
 *
 * See docs/patterns/external-projections.md for detailed rationale.
 */
export { listBuiltinProjections, registerBuiltinProjections, } from "./builtins.js";
export * from "./interface.js";
export { NextJsProjection } from "./nextjs/generator.js";
export * from "./registry.js";
export { RoutesProjection } from "./routes/generator.js";
export type { ManualRouteDeclaration, RouteEntry, RouteManifest, RouteParam, RoutesProjectionOptions, } from "./routes/types.js";
//# sourceMappingURL=index.d.ts.map