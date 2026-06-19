/**
 * Async durable queue for cross-entity reactions.
 *
 * Public surface of the async-reactions subsystem:
 * - {@link PostgresAsyncReactionStore}  — production durable queue (Postgres)
 * - {@link InMemoryAsyncReactionStore}  — tests / dev without DB
 * - {@link asyncReactionRegistry}       — handler registry (populate at boot)
 * - {@link drainAsyncReactions}         — worker drain loop
 * - Types: {@link AsyncReactionJob}, {@link AsyncReactionHandler}, etc.
 *
 * See `types.ts` for the constitution-alignment rationale and the at-least-once
 * delivery contract.
 *
 * @packageDocumentation
 */

export { PostgresAsyncReactionStore } from "./postgres-async-reaction-store";
export type { PostgresAsyncReactionStoreOptions } from "./postgres-async-reaction-store";
export { InMemoryAsyncReactionStore } from "./in-memory-async-reaction-store";
export type { InMemoryAsyncReactionStoreOptions } from "./in-memory-async-reaction-store";
export {
  asyncReactionRegistry,
  type RegisteredAsyncReaction,
} from "./handler-registry";
export {
  drainAsyncReactions,
  type DrainAsyncReactionsContext,
  type DrainResult,
} from "./drain-async-reactions";
export {
  computeBackoffMs,
  DEFAULT_ASYNC_REACTION_POLICY,
  type AsyncReactionHandler,
  type AsyncReactionHandlerContext,
  type AsyncReactionJob,
  type AsyncReactionJobStatus,
  type AsyncReactionQueueOptions,
  type AsyncReactionStore,
  type TriggeringEventPayload,
} from "./types";
export {
  createAsyncDispatch,
  type AsyncDispatch,
  type AsyncDispatchContext,
  type CapturedTriggeringEvent,
} from "./async-dispatch";
export { EVENT_UPDATED_BOARD_SYNC_REACTION, eventUpdatedBoardSyncHandler } from "./handlers/event-updated-board-sync-handler";
export { SHIPMENT_ITEM_RECEIVED_INVENTORY_RESTOCK_REACTION, shipmentItemReceivedInventoryRestockHandler } from "./handlers/shipment-item-received-inventory-restock-handler";
export { EVENT_CANCELLED_CASCADE_REACTION, eventCancelledCascadeHandler } from "./handlers/event-cancelled-cascade-handler";
export { EVENT_CREATED_CLIENT_INTERACTION_REACTION, eventCreatedClientInteractionHandler } from "./handlers/event-created-client-interaction-handler";
export { EVENT_LOCATION_CATERING_SYNC_REACTION, eventLocationCateringSyncHandler } from "./handlers/event-location-catering-sync-handler";
export { EVENT_STAFF_ASSIGNED_NOTIFY_REACTION, eventStaffAssignedNotifyHandler } from "./handlers/event-staff-assigned-notify-handler";
export { PREP_LIST_CANCELLED_RELEASE_RESERVATION_REACTION, prepListCancelledReleaseReservationHandler } from "./handlers/prep-list-cancelled-release-reservation-handler";
export { VENDOR_BLACKLISTED_CANCEL_PURCHASE_ORDERS_REACTION, vendorBlacklistedCancelPurchaseOrdersHandler } from "./handlers/vendor-blacklisted-cancel-purchase-orders-handler";
export { CONTAINER_DEACTIVATED_DISH_CLEAR_REACTION, containerDeactivatedDishClearHandler } from "./handlers/container-deactivated-dish-clear-handler";
export { CHART_OF_ACCOUNT_DEACTIVATED_DEACTIVATE_CHILDREN_REACTION, chartOfAccountDeactivatedDeactivateChildrenHandler } from "./handlers/chart-of-account-deactivated-deactivate-children-handler";
export { LEAD_CONVERTED_DEAL_CREATE_REACTION, leadConvertedDealCreateHandler } from "./handlers/lead-converted-deal-create-handler";
export { CONTRACT_SIGNED_EVENT_CONFIRM_REACTION, contractSignedEventConfirmHandler } from "./handlers/contract-signed-event-confirm-handler";
export { PAYMENT_PROCESSED_INVOICE_APPLY_REACTION, paymentProcessedInvoiceApplyHandler } from "./handlers/payment-processed-invoice-apply-handler";
export { INVOICE_FULLY_PAID_MARK_PAID_REACTION, invoiceFullyPaidMarkPaidHandler } from "./handlers/invoice-fully-paid-mark-paid-handler";
export { INGREDIENT_RECALLED_QUARANTINE_INVENTORY_REACTION, ingredientRecalledQuarantineInventoryHandler } from "./handlers/ingredient-recalled-quarantine-inventory-handler";
export { EMAIL_TEMPLATE_DELETED_DEACTIVATE_WORKFLOWS_REACTION, emailTemplateDeletedDeactivateWorkflowsHandler } from "./handlers/email-template-deleted-deactivate-workflows-handler";
export { STAFF_MEMBER_DEACTIVATED_UNASSIGN_EVENT_STAFF_REACTION, staffMemberDeactivatedUnassignEventStaffHandler } from "./handlers/staff-member-deactivated-unassign-event-staff-handler";
export { CLIENT_INTERACTION_OVERDUE_NOTIFY_REACTION, clientInteractionOverdueNotifyHandler } from "./handlers/client-interaction-overdue-notify-handler";
export { CLIENT_INTERACTION_ESCALATED_NOTIFY_REACTION, clientInteractionEscalatedNotifyHandler } from "./handlers/client-interaction-escalated-notify-handler";
export { EMPLOYEE_CERTIFICATION_LAPSED_NOTIFY_REACTION, employeeCertificationLapsedNotifyHandler } from "./handlers/employee-certification-lapsed-notify-handler";
export { captureTriggeringEvents } from "./capture-triggering-events";
export {
  ASYNC_REACTION_HANDLER_MAP,
  type RegisteredAsyncHandler,
} from "./handler-map";
