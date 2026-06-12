/**
 * Manifest runtime middleware modules.
 *
 * Each middleware runs inside the Manifest engine lifecycle and replaces
 * hand-rolled Proxy wrappers or ad-hoc hooks with composable lifecycle hooks.
 *
 * @packageDocumentation
 */

export { createRbacMiddleware, type RbacMiddlewareOptions } from "./rbac-middleware";
export { createIdentityMiddleware, type IdentityMiddlewareOptions } from "./identity-middleware";
export {
  createPrepInventoryDemandMiddleware,
  type PrepDemandDiagnostic,
  type PrepInventoryDemandMiddlewareOptions,
} from "./prep-inventory-demand-middleware";
