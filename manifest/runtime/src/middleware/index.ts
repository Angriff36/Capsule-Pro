/**
 * Manifest runtime middleware modules.
 *
 * Each middleware runs inside the Manifest engine lifecycle and replaces
 * hand-rolled Proxy wrappers or ad-hoc hooks with composable lifecycle hooks.
 *
 * @packageDocumentation
 */

export {
  type ContractSignedEventConfirmDiagnostic,
  type ContractSignedEventConfirmMiddlewareOptions,
  createContractSignedEventConfirmMiddleware,
} from "./contract-signed-event-confirm-middleware";
export {
  createIdentityMiddleware,
  type IdentityMiddlewareOptions,
} from "./identity-middleware";
export {
  createLeadConvertedDealCreateMiddleware,
  type LeadConvertedDealCreateMiddlewareOptions,
  type LeadConvertedDealDiagnostic,
} from "./lead-converted-deal-create-middleware";
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
