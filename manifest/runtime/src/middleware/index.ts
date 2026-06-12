/**
 * Manifest runtime middleware modules.
 *
 * Each middleware runs inside the Manifest engine lifecycle and replaces
 * hand-rolled Proxy wrappers or ad-hoc hooks with composable lifecycle hooks.
 *
 * @packageDocumentation
 */

export {
  createIdentityMiddleware,
  type IdentityMiddlewareOptions,
} from "./identity-middleware";
export {
  createPrepInventoryDemandMiddleware,
  type PrepDemandDiagnostic,
  type PrepInventoryDemandMiddlewareOptions,
} from "./prep-inventory-demand-middleware";
export {
  AUTO_SEED_MARKER,
  createPrepListSeedMiddleware,
  type PrepListSeedMiddlewareOptions,
  type PrepSeedDiagnostic,
} from "./prep-list-seed-middleware";
export {
  createRbacMiddleware,
  type RbacMiddlewareOptions,
} from "./rbac-middleware";
