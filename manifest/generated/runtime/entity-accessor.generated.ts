// Generated from manifest.config.yaml + prisma-model-metadata — DO NOT EDIT
// Producer: manifest/scripts/generate-entity-accessor.mjs
// Re-run: pnpm manifest:generate-metadata
/* eslint-disable */

export interface EntityResolution {
  accessor: string;
  createdAtField: string | null;
  drop: boolean;
  exists: boolean;
  hasDetail: boolean;
  softDeleteField: string | null;
  tenantIdField: string;
}

const RESOLUTIONS: Record<string, EntityResolution> = {
  "ActionMilestone": {
    "accessor": "actionMilestone",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "AdminChatMessage": {
    "accessor": "adminChatMessage",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AdminChatParticipant": {
    "accessor": "adminChatParticipant",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AdminChatThread": {
    "accessor": "adminChatThread",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AdminTask": {
    "accessor": "adminTask",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AdminTaskAttachment": {
    "accessor": "adminTaskAttachment",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AdminTaskComment": {
    "accessor": "adminTaskComment",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AdminTaskDevMeta": {
    "accessor": "adminTaskDevMeta",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AdminTaskFileRef": {
    "accessor": "adminTaskFileRef",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AiEventSetupSession": {
    "accessor": "aiEventSetupSession",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "AlertsConfig": {
    "accessor": "alertsConfig",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AllergenWarning": {
    "accessor": "allergenWarning",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ApiKey": {
    "accessor": "apiKey",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AuditSchedule": {
    "accessor": "auditSchedule",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "AutomatedFollowup": {
    "accessor": "automatedFollowup",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "BankAccount": {
    "accessor": "employeeBankAccount",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "BattleBoard": {
    "accessor": "battleBoard",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "BoardAnnotation": {
    "accessor": "boardAnnotation",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "BoardConfig": {
    "accessor": "boardConfig",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "BoardProjection": {
    "accessor": "boardProjection",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Budget": {
    "accessor": "budget",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "BudgetAlert": {
    "accessor": "budgetAlert",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "BudgetLineItem": {
    "accessor": "budgetLineItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "BulkCombineRule": {
    "accessor": "bulk_combine_rules",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "BulkOrderRule": {
    "accessor": "bulkOrderRule",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CallPlanningSession": {
    "accessor": "callPlanningSession",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CateringOrder": {
    "accessor": "cateringOrder",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ChartOfAccount": {
    "accessor": "chartOfAccount",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "Client": {
    "accessor": "client",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ClientContact": {
    "accessor": "clientContact",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ClientInteraction": {
    "accessor": "clientInteraction",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ClientPreference": {
    "accessor": "clientPreference",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CollectionAction": {
    "accessor": "collectionAction",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "CollectionCase": {
    "accessor": "collectionCase",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CollectionPaymentPlan": {
    "accessor": "collectionPaymentPlan",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "CommandBoard": {
    "accessor": "commandBoard",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CommandBoardCard": {
    "accessor": "commandBoardCard",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CommandBoardConnection": {
    "accessor": "commandBoardConnection",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CommandBoardGroup": {
    "accessor": "commandBoardGroup",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CommandBoardLayout": {
    "accessor": "commandBoardLayout",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Container": {
    "accessor": "container",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ContractSignature": {
    "accessor": "contractSignature",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CorrectiveAction": {
    "accessor": "correctiveAction",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CrmScoringRule": {
    "accessor": "crmScoringRule",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CycleCountRecord": {
    "accessor": "cycleCountRecord",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "CycleCountSession": {
    "accessor": "cycleCountSession",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Deal": {
    "accessor": "deal",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "DeliveryRoute": {
    "accessor": "deliveryRoute",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "DisciplinaryAction": {
    "accessor": "disciplinaryAction",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "Dish": {
    "accessor": "dish",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Document": {
    "accessor": "documents",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": "deleted_at"
  },
  "DocumentVersion": {
    "accessor": "documentVersion",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "Driver": {
    "accessor": "driver",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EmailTemplate": {
    "accessor": "emailTemplate",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EmailWorkflow": {
    "accessor": "emailWorkflow",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EmployeeAvailability": {
    "accessor": "employeeAvailability",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EmployeeCertification": {
    "accessor": "employeeCertification",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EmployeeDeduction": {
    "accessor": "employeeDeduction",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EntityVersion": {
    "accessor": "entityVersion",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "Equipment": {
    "accessor": "equipment",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Event": {
    "accessor": "event",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventBudget": {
    "accessor": "eventBudget",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventContract": {
    "accessor": "eventContract",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventDish": {
    "accessor": "eventDish",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventFollowup": {
    "accessor": "eventFollowup",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": "deleted_at"
  },
  "EventGuest": {
    "accessor": "eventGuest",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventImport": {
    "accessor": "eventImport",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventImportWorkflow": {
    "accessor": "eventImport",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventPlanningDraft": {
    "accessor": "eventPlanningDraft",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventProfitability": {
    "accessor": "eventProfitability",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventReport": {
    "accessor": "eventReport",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventStaff": {
    "accessor": "eventStaff",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventSummary": {
    "accessor": "eventSummary",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventTimeline": {
    "accessor": "eventTimeline",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventTimelineItem": {
    "accessor": "eventTimeline",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "EventWaitlistEntry": {
    "accessor": "eventWaitlistEntry",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "Facility": {
    "accessor": "facility",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "FacilityArea": {
    "accessor": "facilityArea",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "FacilityAsset": {
    "accessor": "facilityAsset",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "FacilitySchedule": {
    "accessor": "facilitySchedule",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "FacilityWorkOrder": {
    "accessor": "facilityWorkOrder",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "ForecastInput": {
    "accessor": "forecastInput",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "Ingredient": {
    "accessor": "ingredient",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "InteractionAttachment": {
    "accessor": "interactionAttachment",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "InventoryAlert": {
    "accessor": "inventoryAlert",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "InventoryForecast": {
    "accessor": "inventoryForecast",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "InventoryItem": {
    "accessor": "inventoryItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "InventoryStock": {
    "accessor": "inventoryStock",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "InventorySupplier": {
    "accessor": "inventorySupplier",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "InventoryTransaction": {
    "accessor": "inventoryTransaction",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "InventoryTransfer": {
    "accessor": "inventoryTransfer",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "InventoryTransferItem": {
    "accessor": "inventoryTransferItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "Invoice": {
    "accessor": "invoice",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "IoTAlert": {
    "accessor": "ioTAlert",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "IotAlertRule": {
    "accessor": "iotAlertRule",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "KitchenTask": {
    "accessor": "kitchenTask",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "KitchenTaskClaim": {
    "accessor": "kitchenTaskClaim",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "KitchenTaskProgress": {
    "accessor": "kitchenTaskProgress",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "KnowledgeBaseEntry": {
    "accessor": "knowledgeBaseEntry",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "LaborBudget": {
    "accessor": "laborBudget",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Lead": {
    "accessor": "lead",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "LogisticsDispatch": {
    "accessor": "logisticsDispatch",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "LogisticsRoute": {
    "accessor": "deliveryRoute",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "MaintenanceWorkOrder": {
    "accessor": "maintenanceWorkOrder",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Menu": {
    "accessor": "menu",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "MenuDish": {
    "accessor": "menuDish",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "MethodVideo": {
    "accessor": "method_videos",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "Note": {
    "accessor": "note",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Notification": {
    "accessor": "notification",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "OnboardingCompletion": {
    "accessor": "onboardingCompletion",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "OnboardingTask": {
    "accessor": "onboardingTask",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": "deleted_at"
  },
  "OpenShift": {
    "accessor": "open_shifts",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "OverrideAudit": {
    "accessor": "overrideAudit",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Payment": {
    "accessor": "payment",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PaymentMethod": {
    "accessor": "paymentMethod",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PaymentRefundAttempt": {
    "accessor": "paymentRefundAttempt",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "PayrollApprovalHistory": {
    "accessor": "payrollApprovalHistory",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PayrollLineItem": {
    "accessor": "payrollLineItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PayrollPeriod": {
    "accessor": "payrollPeriod",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PayrollRun": {
    "accessor": "payrollRun",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PerformancePrediction": {
    "accessor": "performancePrediction",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "PerformanceReview": {
    "accessor": "performanceReview",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "PrepComment": {
    "accessor": "prepComment",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PrepList": {
    "accessor": "prepList",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PrepListImport": {
    "accessor": "prep_list_imports",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "PrepListItem": {
    "accessor": "prepListItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PrepMethod": {
    "accessor": "prepMethod",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PrepTask": {
    "accessor": "prepTask",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PrepTaskPlanWorkflow": {
    "accessor": "prepTaskPlanWorkflow",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PreventiveMaintenanceSchedule": {
    "accessor": "preventiveMaintenanceSchedule",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PricingTier": {
    "accessor": "pricingTier",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ProcurementBudget": {
    "accessor": "procurementBudget",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ProcurementBudgetAlert": {
    "accessor": "procurementBudgetAlert",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Proposal": {
    "accessor": "proposal",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ProposalDraft": {
    "accessor": "proposalDraft",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ProposalLineItem": {
    "accessor": "proposalLineItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ProposalTemplate": {
    "accessor": "proposalTemplate",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PurchaseOrder": {
    "accessor": "purchaseOrder",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PurchaseOrderItem": {
    "accessor": "purchaseOrderItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PurchaseRequisition": {
    "accessor": "purchaseRequisition",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "PurchaseRequisitionItem": {
    "accessor": "purchaseRequisitionItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "QACheck": {
    "accessor": "qACheck",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "QACorrectiveAction": {
    "accessor": "correctiveAction",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "QATemperatureLog": {
    "accessor": "temperatureLog",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "QualityCheck": {
    "accessor": "qualityCheck",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "QualityCheckItem": {
    "accessor": "qualityCheckItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "RateLimitConfig": {
    "accessor": "rateLimitConfig",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Recipe": {
    "accessor": "recipe",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "RecipeIngredient": {
    "accessor": "recipeIngredient",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "RecipeStep": {
    "accessor": "recipeStep",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "RecipeVersion": {
    "accessor": "recipeVersion",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ReorderSuggestion": {
    "accessor": "reorderSuggestion",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "Report": {
    "accessor": "report",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "RevenueRecognitionLine": {
    "accessor": "revenueRecognitionLine",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "RevenueRecognitionSchedule": {
    "accessor": "revenueRecognitionSchedule",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "RolePolicy": {
    "accessor": "rolePolicy",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "RouteStop": {
    "accessor": "routeStop",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "SampleData": {
    "accessor": "sampleData",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "Schedule": {
    "accessor": "schedule",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ScheduleShift": {
    "accessor": "scheduleShift",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "SelOnboardingTrainingModuleDefinition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion01Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion02Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion03Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion04Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion05Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion06Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion07Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion08Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion09Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "SelOnboardingTrainingQuestion10Definition": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "Shipment": {
    "accessor": "shipment",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "ShipmentItem": {
    "accessor": "shipmentItem",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "SmsAutomationRule": {
    "accessor": "sms_automation_rules",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": "deleted_at"
  },
  "StaffMember": {
    "accessor": "staffMember",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "StaffPerformance": {
    "accessor": "staffPerformance",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "StaffTrainingSignal": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "Station": {
    "accessor": "station",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "StorageLocation": {
    "accessor": "storage_locations",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": "deleted_at"
  },
  "TaskBundle": {
    "accessor": "task_bundles",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "TaskBundleItem": {
    "accessor": "task_bundle_items",
    "exists": true,
    "drop": false,
    "hasDetail": false,
    "tenantIdField": "tenant_id",
    "createdAtField": "created_at",
    "softDeleteField": null
  },
  "TemperatureLog": {
    "accessor": "temperatureLog",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TemperatureProbe": {
    "accessor": "temperatureProbe",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TemperatureReading": {
    "accessor": "temperatureReading",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "TimeEntry": {
    "accessor": "timeEntry",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TimeOffRequest": {
    "accessor": "timeOffRequest",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TimecardApproval": {
    "accessor": "timecardApproval",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TimecardEditRequest": {
    "accessor": "timecardEditRequest",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TimelineTask": {
    "accessor": "timelineTask",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TipPool": {
    "accessor": "tipPool",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TrainingAssignment": {
    "accessor": "trainingAssignment",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TrainingAttempt": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "TrainingCompletion": {
    "accessor": "trainingCompletion",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "TrainingModule": {
    "accessor": "trainingModule",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "TrainingQuestion": {
    "accessor": "",
    "exists": false,
    "drop": true,
    "hasDetail": false,
    "tenantIdField": "tenantId",
    "createdAtField": null,
    "softDeleteField": null
  },
  "User": {
    "accessor": "user",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "VarianceReport": {
    "accessor": "varianceReport",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Vehicle": {
    "accessor": "vehicle",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Vendor": {
    "accessor": "vendor",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "VendorCatalog": {
    "accessor": "vendorCatalog",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "VendorContact": {
    "accessor": "vendorContact",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "VendorContract": {
    "accessor": "vendorContract",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "VendorRating": {
    "accessor": "vendorRating",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Venue": {
    "accessor": "venue",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "VersionApproval": {
    "accessor": "versionApproval",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "VersionedEntity": {
    "accessor": "versionedEntity",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  },
  "WasteEntry": {
    "accessor": "wasteEntry",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "WorkOrder": {
    "accessor": "workOrder",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "Workflow": {
    "accessor": "workflow",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": "deletedAt"
  },
  "WorkforceOptimization": {
    "accessor": "workforceOptimization",
    "exists": true,
    "drop": false,
    "hasDetail": true,
    "tenantIdField": "tenantId",
    "createdAtField": "createdAt",
    "softDeleteField": null
  }
};

const DROP: EntityResolution = {
  accessor: "",
  exists: false,
  drop: true,
  hasDetail: false,
  tenantIdField: "tenantId",
  createdAtField: null,
  softDeleteField: null,
};

export function resolveEntityAccessor(entityName: string): EntityResolution {
  return RESOLUTIONS[entityName] ?? DROP;
}

export function buildTenantWhere(
  entityName: string,
  tenantId: string,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const r = resolveEntityAccessor(entityName);
  const where: Record<string, unknown> = {
    [r.tenantIdField]: tenantId,
    ...extra,
  };
  if (r.softDeleteField) {
    where[r.softDeleteField] = null;
  }
  return where;
}

export function buildOrderBy(entityName: string): Record<string, string> {
  const r = resolveEntityAccessor(entityName);
  if (!r.createdAtField) {
    return {};
  }
  return { [r.createdAtField]: "desc" };
}
