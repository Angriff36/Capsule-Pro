/**
 * Manifest runtime middleware modules.
 *
 * Each middleware runs inside the Manifest engine lifecycle and replaces
 * hand-rolled Proxy wrappers or ad-hoc hooks with composable lifecycle hooks.
 *
 * @packageDocumentation
 */

export {
  type ClientInteractionEscalatedNotifyDiagnostic,
  type ClientInteractionEscalatedNotifyMiddlewareOptions,
  createClientInteractionEscalatedNotifyMiddleware,
} from "./client-interaction-escalated-notify-middleware";
export {
  type ClientInteractionOverdueNotifyDiagnostic,
  type ClientInteractionOverdueNotifyMiddlewareOptions,
  createClientInteractionOverdueNotifyMiddleware,
} from "./client-interaction-overdue-notify-middleware";
export {
  type CollectionInvoiceApplyDiagnostic,
  type CollectionPaymentRecordedInvoiceApplyMiddlewareOptions,
  createCollectionPaymentRecordedInvoiceApplyMiddleware,
} from "./collection-payment-recorded-invoice-apply-middleware";
export {
  type CollectionInvoiceWriteOffDiagnostic,
  type CollectionWrittenOffInvoiceWriteOffMiddlewareOptions,
  createCollectionWrittenOffInvoiceWriteOffMiddleware,
} from "./collection-written-off-invoice-write-off-middleware";
export {
  type ContractSignedEventConfirmDiagnostic,
  type ContractSignedEventConfirmMiddlewareOptions,
  createContractSignedEventConfirmMiddleware,
} from "./contract-signed-event-confirm-middleware";
export {
  createDealLifecyclePropagationMiddleware,
  type DealLifecyclePropagationDiagnostic,
  type DealLifecyclePropagationMiddlewareOptions,
} from "./deal-lifecycle-propagation-middleware";
export {
  createDishDeactivatedPruneMiddleware,
  type DishDeactivatedPruneDiagnostic,
  type DishDeactivatedPruneMiddlewareOptions,
} from "./dish-deactivated-prune-middleware";
export {
  createEventCancelledCascadeMiddleware,
  type EventCancelledCascadeDiagnostic,
  type EventCancelledCascadeMiddlewareOptions,
} from "./event-cancelled-cascade-middleware";
export {
  createEventCreatedClientInteractionMiddleware,
  type EventClientInteractionDiagnostic,
  type EventCreatedClientInteractionMiddlewareOptions,
} from "./event-created-client-interaction-middleware";
export {
  createEventDishPrepSyncMiddleware,
  type EventDishPrepSyncDiagnostic,
  type EventDishPrepSyncMiddlewareOptions,
} from "./event-dish-prep-sync-middleware";
export {
  createEventGuestCountPrepRescaleMiddleware,
  type EventGuestCountPrepRescaleMiddlewareOptions,
  type EventGuestCountRescaleDiagnostic,
} from "./event-guest-count-prep-rescale-middleware";
export {
  createEventLocationCateringSyncMiddleware,
  type EventCateringVenueSyncDiagnostic,
  type EventLocationCateringSyncMiddlewareOptions,
} from "./event-location-catering-sync-middleware";
export {
  createEventStaffAssignedNotifyMiddleware,
  type EventStaffAssignedNotifyDiagnostic,
  type EventStaffAssignedNotifyMiddlewareOptions,
} from "./event-staff-assigned-notify-middleware";
export {
  createEventUpdatedBoardSyncMiddleware,
  type EventBoardSyncDiagnostic,
  type EventUpdatedBoardSyncMiddlewareOptions,
} from "./event-updated-board-sync-middleware";
export {
  createFacilityWorkOrderAssetStatusMiddleware,
  type FacilityWorkOrderAssetStatusDiagnostic,
  type FacilityWorkOrderAssetStatusMiddlewareOptions,
} from "./facility-work-order-asset-status-middleware";
export {
  createIdentityMiddleware,
  type IdentityMiddlewareOptions,
} from "./identity-middleware";
export {
  createInventoryMovementTransactionMiddleware,
  type InventoryLedgerDiagnostic,
  type InventoryMovementTransactionMiddlewareOptions,
} from "./inventory-movement-transaction-middleware";
export {
  createInventoryStockSyncItemMiddleware,
  type InventoryStockSyncDiagnostic,
  type InventoryStockSyncItemMiddlewareOptions,
} from "./inventory-stock-sync-item-middleware";
export {
  createInventoryTransferReceivedStockMovementMiddleware,
  type InventoryTransferReceivedStockMovementMiddlewareOptions,
  type InventoryTransferStockMovementDiagnostic,
} from "./inventory-transfer-received-stock-movement-middleware";
export {
  createInvoiceFullyPaidMarkPaidMiddleware,
  type InvoiceFullyPaidMarkPaidDiagnostic,
  type InvoiceFullyPaidMarkPaidMiddlewareOptions,
} from "./invoice-fully-paid-mark-paid-middleware";
export {
  createInvoiceOverdueCollectionCaseCreateMiddleware,
  type InvoiceOverdueCollectionCaseCreateMiddlewareOptions,
  type InvoiceOverdueCollectionCaseDiagnostic,
} from "./invoice-overdue-collection-case-create-middleware";
export {
  createInvoiceWrittenOffRevRecCancelMiddleware,
  type InvoiceWrittenOffRevRecCancelDiagnostic,
  type InvoiceWrittenOffRevRecCancelMiddlewareOptions,
} from "./invoice-written-off-revrec-cancel-middleware";
export {
  createLeadConvertedDealCreateMiddleware,
  type LeadConvertedDealCreateMiddlewareOptions,
  type LeadConvertedDealDiagnostic,
} from "./lead-converted-deal-create-middleware";
export {
  createMaintenanceCompletedEquipmentRecordMiddleware,
  type MaintenanceCompletedEquipmentRecordMiddlewareOptions,
  type MaintenanceEquipmentRecordDiagnostic,
} from "./maintenance-completed-equipment-record-middleware";
export {
  createMaintenanceCreatedEquipmentStatusMiddleware,
  type MaintenanceCreatedEquipmentStatusMiddlewareOptions,
  type MaintenanceEquipmentStatusDiagnostic,
} from "./maintenance-created-equipment-status-middleware";
export {
  createPaymentProcessedInvoiceApplyMiddleware,
  type PaymentInvoiceApplyDiagnostic,
  type PaymentProcessedInvoiceApplyMiddlewareOptions,
} from "./payment-processed-invoice-apply-middleware";
export {
  createPaymentPlanCompletedCollectionCaseResolveMiddleware,
  type PaymentPlanCollectionResolveDiagnostic,
  type PaymentPlanCompletedCollectionCaseResolveMiddlewareOptions,
} from "./payment-plan-completed-collection-case-resolve-middleware";
export {
  createPaymentRefundedInvoiceRecordMiddleware,
  type PaymentInvoiceRefundDiagnostic,
  type PaymentRefundedInvoiceRecordMiddlewareOptions,
} from "./payment-refunded-invoice-record-middleware";
export {
  createPayrollRunPaidPeriodLockMiddleware,
  type PayrollRunPaidPeriodLockDiagnostic,
  type PayrollRunPaidPeriodLockMiddlewareOptions,
} from "./payroll-run-paid-period-lock-middleware";
export {
  createPrepInventoryDemandMiddleware,
  type PrepDemandDiagnostic,
  type PrepInventoryDemandMiddlewareOptions,
} from "./prep-inventory-demand-middleware";
export {
  createPrepListCancelledReleaseReservationMiddleware,
  type PrepListCancelledReleaseReservationMiddlewareOptions,
  type PrepReleaseReservationDiagnostic,
} from "./prep-list-cancelled-release-reservation-middleware";
export {
  createPrepListCompletedConsumeMiddleware,
  type PrepConsumeDiagnostic,
  type PrepListCompletedConsumeMiddlewareOptions,
} from "./prep-list-completed-consume-middleware";
export {
  AUTO_SEED_MARKER,
  createPrepListSeedMiddleware,
  type PrepListSeedMiddlewareOptions,
  type PrepSeedDiagnostic,
} from "./prep-list-seed-middleware";
export {
  createPrepTaskStationCountMiddleware,
  type PrepTaskStationCountDiagnostic,
  type PrepTaskStationCountMiddlewareOptions,
} from "./prep-task-station-count-middleware";
export {
  createProposalLifecycleLeadStatusMiddleware,
  type ProposalLeadStatusDiagnostic,
  type ProposalLifecycleLeadStatusMiddlewareOptions,
} from "./proposal-lifecycle-lead-status-middleware";
export {
  createProposalLineItemCountMiddleware,
  type ProposalLineItemCountDiagnostic,
  type ProposalLineItemCountMiddlewareOptions,
} from "./proposal-line-item-count-middleware";
export {
  createRbacMiddleware,
  type RbacMiddlewareOptions,
} from "./rbac-middleware";
export {
  createSchedulePublishedNotifyStaffMiddleware,
  type SchedulePublishedNotifyStaffDiagnostic,
  type SchedulePublishedNotifyStaffMiddlewareOptions,
} from "./schedule-published-notify-staff-middleware";
export {
  createScheduleShiftFirstShiftDueDateMiddleware,
  type FirstShiftDueDateDiagnostic,
  type ScheduleShiftFirstShiftDueDateMiddlewareOptions,
} from "./schedule-shift-first-shift-due-date-middleware";
export {
  createShipmentItemReceivedInventoryRestockMiddleware,
  type ShipmentItemReceivedInventoryRestockMiddlewareOptions,
  type ShipmentRestockDiagnostic,
} from "./shipment-item-received-inventory-restock-middleware";
export {
  createStaffMemberCreatedTrainingAssignmentMiddleware,
  type StaffMemberCreatedTrainingAssignmentMiddlewareOptions,
  type StaffTrainingAssignDiagnostic,
} from "./staff-member-created-training-assignment-middleware";
export {
  createStaffMemberDeactivatedUnassignEventStaffMiddleware,
  type StaffMemberDeactivatedUnassignDiagnostic,
  type StaffMemberDeactivatedUnassignEventStaffMiddlewareOptions,
} from "./staff-member-deactivated-unassign-event-staff-middleware";
export {
  createTimeOffApprovedShiftCleanupMiddleware,
  type TimeOffApprovedShiftCleanupDiagnostic,
  type TimeOffApprovedShiftCleanupMiddlewareOptions,
} from "./time-off-approved-shift-cleanup-middleware";
export {
  createTimecardEditApprovedTimeEntryApplyMiddleware,
  type TimecardEditApplyDiagnostic,
  type TimecardEditApprovedTimeEntryApplyMiddlewareOptions,
} from "./timecard-edit-approved-time-entry-apply-middleware";
export {
  createTrainingAttemptSubmittedRecordMiddleware,
  type TrainingAttemptRecordDiagnostic,
  type TrainingAttemptSubmittedRecordMiddlewareOptions,
} from "./training-attempt-submitted-record-middleware";
