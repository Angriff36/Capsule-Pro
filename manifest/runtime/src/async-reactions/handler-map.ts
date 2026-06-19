/**
 * Async reaction handler map — the single wiring site for async reactions.
 *
 * Each async reaction declared in the {@link MiddlewareRegistry} with an
 * `asyncReactionName` has its handler registered here. The factory iterates
 * this map to populate {@link asyncReactionRegistry} — replacing the previous
 * ad-hoc hand-written 20-entry `registerAsyncReactionHandlers()` block.
 *
 * The map is the imperative counterpart to the registry's declarative
 * `asyncReactionName` field: the registry documents the CONTRACT (trigger,
 * target, idempotency, retry), this map provides the IMPLEMENTATION (the
 * handler function the worker invokes).
 *
 * @packageDocumentation
 */

import type { AsyncReactionHandler } from "./types";
import { chartOfAccountDeactivatedDeactivateChildrenHandler } from "./handlers/chart-of-account-deactivated-deactivate-children-handler";
import { clientInteractionEscalatedNotifyHandler } from "./handlers/client-interaction-escalated-notify-handler";
import { clientInteractionOverdueNotifyHandler } from "./handlers/client-interaction-overdue-notify-handler";
import { containerDeactivatedDishClearHandler } from "./handlers/container-deactivated-dish-clear-handler";
import { contractSignedEventConfirmHandler } from "./handlers/contract-signed-event-confirm-handler";
import { emailTemplateDeletedDeactivateWorkflowsHandler } from "./handlers/email-template-deleted-deactivate-workflows-handler";
import { employeeCertificationLapsedNotifyHandler } from "./handlers/employee-certification-lapsed-notify-handler";
import { eventCancelledCascadeHandler } from "./handlers/event-cancelled-cascade-handler";
import { eventCreatedClientInteractionHandler } from "./handlers/event-created-client-interaction-handler";
import { eventLocationCateringSyncHandler } from "./handlers/event-location-catering-sync-handler";
import { eventStaffAssignedNotifyHandler } from "./handlers/event-staff-assigned-notify-handler";
import { eventUpdatedBoardSyncHandler } from "./handlers/event-updated-board-sync-handler";
import { ingredientRecalledQuarantineInventoryHandler } from "./handlers/ingredient-recalled-quarantine-inventory-handler";
import { invoiceFullyPaidMarkPaidHandler } from "./handlers/invoice-fully-paid-mark-paid-handler";
import { leadConvertedDealCreateHandler } from "./handlers/lead-converted-deal-create-handler";
import { paymentProcessedInvoiceApplyHandler } from "./handlers/payment-processed-invoice-apply-handler";
import { prepListCancelledReleaseReservationHandler } from "./handlers/prep-list-cancelled-release-reservation-handler";
import { shipmentItemReceivedInventoryRestockHandler } from "./handlers/shipment-item-received-inventory-restock-handler";
import { staffMemberDeactivatedUnassignEventStaffHandler } from "./handlers/staff-member-deactivated-unassign-event-staff-handler";
import { vendorBlacklistedCancelPurchaseOrdersHandler } from "./handlers/vendor-blacklisted-cancel-purchase-orders-handler";

/**
 * A registered async reaction: its handler + a human description.
 */
export interface RegisteredAsyncHandler {
  /** Stable handler key (matches the job's `reactionName`). */
  name: string;
  /** One-line description of what the reaction does. */
  description: string;
  /** The handler function invoked by the worker. */
  handler: AsyncReactionHandler;
}

/**
 * The authoritative map of async reaction handlers.
 *
 * To add an async reaction:
 *   1. Declare it in the {@link MiddlewareRegistry} with `executionMode:
 *      "async"` + `asyncReactionName: "<key>"`.
 *   2. Author the handler (see an existing `*-handler.ts`).
 *   3. Add one row here keyed by the SAME `<key>`.
 *
 * The factory registers every entry here into {@link asyncReactionRegistry};
 * the middleware-registry completeness check verifies the two stay in sync.
 */
export const ASYNC_REACTION_HANDLER_MAP: RegisteredAsyncHandler[] = [
  {
    name: "eventUpdatedBoardSync",
    description:
      "EventUpdated/DateUpdated/LocationUpdated → fan out BattleBoard.syncFromEvent per linked board",
    handler: eventUpdatedBoardSyncHandler,
  },
  {
    name: "shipmentItemReceivedInventoryRestock",
    description:
      "ShipmentItemReceived → InventoryItem.restock (load line, preserve unitCost)",
    handler: shipmentItemReceivedInventoryRestockHandler,
  },
  {
    name: "eventCancelledCascade",
    description:
      "EventCancelled → fan out unassign/cancel/voidInvoice/close per eligible child",
    handler: eventCancelledCascadeHandler,
  },
  {
    name: "eventCreatedClientInteraction",
    description:
      "EventCreated → ClientInteraction.create (attributed to job.actorId, idempotent per event)",
    handler: eventCreatedClientInteractionHandler,
  },
  {
    name: "eventLocationCateringSync",
    description:
      "EventLocationUpdated → fan out CateringOrder.syncVenue per linked active order",
    handler: eventLocationCateringSyncHandler,
  },
  {
    name: "eventStaffAssignedNotify",
    description: "EventStaffAssigned → Notification.create to the assigned staff member",
    handler: eventStaffAssignedNotifyHandler,
  },
  {
    name: "prepListCancelledReleaseReservation",
    description:
      "PrepListCancelled → fan out InventoryItem.releaseReservation per item still holding a reservation",
    handler: prepListCancelledReleaseReservationHandler,
  },
  {
    name: "vendorBlacklistedCancelPurchaseOrders",
    description: "VendorBlacklisted → fan out PurchaseOrder.cancel per cancellable open order",
    handler: vendorBlacklistedCancelPurchaseOrdersHandler,
  },
  {
    name: "containerDeactivatedDishClear",
    description: "ContainerDeactivated → fan out Dish.clearDefaultContainer per dependent dish",
    handler: containerDeactivatedDishClearHandler,
  },
  {
    name: "chartOfAccountDeactivatedDeactivateChildren",
    description:
      "ChartOfAccountDeactivated → ChartOfAccount.deactivate per active child (subtree fans out via separate jobs)",
    handler: chartOfAccountDeactivatedDeactivateChildrenHandler,
  },
  {
    name: "leadConvertedDealCreate",
    description: "LeadConvertedToClient → Deal.create (load lead for title/value)",
    handler: leadConvertedDealCreateHandler,
  },
  {
    name: "contractSignedEventConfirm",
    description:
      "ContractSigned → Event.confirm (load contract for eventId; guard-safe skip on already-confirmed)",
    handler: contractSignedEventConfirmHandler,
  },
  {
    name: "paymentProcessedInvoiceApply",
    description: "PaymentProcessed → Invoice.applyPayment (guard-safe: skip DRAFT/overpay)",
    handler: paymentProcessedInvoiceApplyHandler,
  },
  {
    name: "invoiceFullyPaidMarkPaid",
    description:
      "PaymentApplied (from applyPayment) → Invoice.markAsPaid when amountDue <= 0 and status != PAID",
    handler: invoiceFullyPaidMarkPaidHandler,
  },
  {
    name: "ingredientRecalledQuarantineInventory",
    description: "IngredientRecallFlagged → InventoryItem.softDelete (food-safety quarantine)",
    handler: ingredientRecalledQuarantineInventoryHandler,
  },
  {
    name: "emailTemplateDeletedDeactivateWorkflows",
    description:
      "EmailTemplateDeleted → fan out EmailWorkflow.setActive(false) per dependent active workflow",
    handler: emailTemplateDeletedDeactivateWorkflowsHandler,
  },
  {
    name: "staffMemberDeactivatedUnassignEventStaff",
    description: "StaffMemberDeactivated → fan out EventStaff.unassign per open assignment",
    handler: staffMemberDeactivatedUnassignEventStaffHandler,
  },
  {
    name: "clientInteractionOverdueNotify",
    description: "ClientInteractionMarkedOverdue → Notification.create for the assignee",
    handler: clientInteractionOverdueNotifyHandler,
  },
  {
    name: "clientInteractionEscalatedNotify",
    description: "ClientInteractionEscalated → Notification.create for the escalation target",
    handler: clientInteractionEscalatedNotifyHandler,
  },
  {
    name: "employeeCertificationLapsedNotify",
    description:
      "EmployeeCertificationExpired/Revoked → Notification.create for the affected employee",
    handler: employeeCertificationLapsedNotifyHandler,
  },
];
