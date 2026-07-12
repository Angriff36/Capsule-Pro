// Generated from Manifest IR by manifest/scripts/generate-field-hints.mjs - DO NOT EDIT.
// Regenerate with: pnpm manifest:field-hints
//
// Per-field Manifest rule descriptions, derived from compiled IR constraint
// expressions (entity + command constraints). Keyed by entity -> property ->
// hints. Used by FieldHint / FormLabelWithHint to surface policy text on
// governed form fields.

export interface ManifestFieldHint {
  message: string;
  severity: "block" | "warn" | "info";
  constraintName: string;
  overrideable: boolean;
}

export type ManifestFieldHintSeverity = ManifestFieldHint["severity"];

export type EntityFieldHints = Record<string, ManifestFieldHint[]>;

export const MANIFEST_FIELD_HINTS: Record<string, EntityFieldHints> = {
  "ActionMilestone": {
    "status": [
      {
        message: "Invalid milestone status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Milestone title is required",
        severity: "block",
        constraintName: "requireTitle",
        overrideable: false,
      },
    ],
  },
  "AdminChatMessage": {
    "authorId": [
      {
        message: "Author ID is required",
        severity: "block",
        constraintName: "requireAuthor",
        overrideable: false,
      },
    ],
    "text": [
      {
        message: "Message text is required",
        severity: "block",
        constraintName: "requireText",
        overrideable: false,
      },
    ],
    "threadId": [
      {
        message: "Chat thread ID is required",
        severity: "block",
        constraintName: "requireThreadId",
        overrideable: false,
      },
    ],
  },
  "AdminTask": {
    "title": [
      {
        message: "Title is required",
        severity: "block",
        constraintName: "requireTitle",
        overrideable: false,
      },
    ],
  },
  "AiEventSetupSession": {
    "confidence": [
      {
        message: "Confidence must be between 0 and 1",
        severity: "block",
        constraintName: "validConfidence",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "AlertsConfig": {
    "channel": [
      {
        message: "Alert channel is required",
        severity: "block",
        constraintName: "requireChannel",
        overrideable: false,
      },
    ],
    "destination": [
      {
        message: "Alert destination is required",
        severity: "block",
        constraintName: "requireDestination",
        overrideable: false,
      },
    ],
  },
  "AllergenWarning": {
    "allergens": [
      {
        message: "Allergens list is required",
        severity: "block",
        constraintName: "requireAllergens",
        overrideable: false,
      },
    ],
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "requireEvent",
        overrideable: false,
      },
    ],
    "isAcknowledged": [
      {
        message: "Warning already acknowledged",
        severity: "warn",
        constraintName: "cannotAcknowledgeTwice",
        overrideable: false,
      },
    ],
    "resolved": [
      {
        message: "Warning already resolved",
        severity: "warn",
        constraintName: "cannotResolveTwice",
        overrideable: false,
      },
    ],
    "severity": [
      {
        message: "Severity must be info, warning, or critical",
        severity: "block",
        constraintName: "validSeverity",
        overrideable: false,
      },
    ],
    "warningType": [
      {
        message: "Warning type is required",
        severity: "block",
        constraintName: "requireWarningType",
        overrideable: false,
      },
    ],
  },
  "ApiKey": {
    "createdByUserId": [
      {
        message: "Created by user ID is required",
        severity: "block",
        constraintName: "requireCreatedBy",
        overrideable: false,
      },
    ],
    "deletedAt": [
      {
        message: "Deleting active API key 'name'",
        severity: "warn",
        constraintName: "warnDeleteActiveKey",
        overrideable: false,
      },
      {
        message: "Revoking active API key 'name'",
        severity: "warn",
        constraintName: "warnRevokeActiveKey",
        overrideable: false,
      },
    ],
    "expiresAt": [
      {
        message: "API key 'name' has expired",
        severity: "block",
        constraintName: "blockExpiredKey",
        overrideable: false,
      },
      {
        message: "Deleting active API key 'name'",
        severity: "warn",
        constraintName: "warnDeleteActiveKey",
        overrideable: false,
      },
      {
        message: "Revoking active API key 'name'",
        severity: "warn",
        constraintName: "warnRevokeActiveKey",
        overrideable: false,
      },
    ],
    "hashedKey": [
      {
        message: "Hashed key is required",
        severity: "block",
        constraintName: "requireHashedKey",
        overrideable: false,
      },
    ],
    "keyPrefix": [
      {
        message: "Key prefix is required",
        severity: "block",
        constraintName: "requireKeyPrefix",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "API key name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "revokedAt": [
      {
        message: "Deleting active API key 'name'",
        severity: "warn",
        constraintName: "warnDeleteActiveKey",
        overrideable: false,
      },
      {
        message: "Revoking active API key 'name'",
        severity: "warn",
        constraintName: "warnRevokeActiveKey",
        overrideable: false,
      },
    ],
  },
  "AuditSchedule": {
    "frequency": [
      {
        message: "Invalid audit frequency",
        severity: "block",
        constraintName: "validFrequency",
        overrideable: false,
      },
    ],
    "isActive": [
      {
        message: "Audit schedule 'name' is inactive — cycle counts will not run automatically",
        severity: "warn",
        constraintName: "warnInactive",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Audit schedule name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "AutomatedFollowup": {
    "status": [
      {
        message: "Invalid followup status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "type": [
      {
        message: "Invalid followup type",
        severity: "block",
        constraintName: "validType",
        overrideable: false,
      },
    ],
  },
  "BankAccount": {
    "accountType": [
      {
        message: "Invalid account type",
        severity: "block",
        constraintName: "validAccountType",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid bank account status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "BattleBoard": {
    "boardName": [
      {
        message: "Board name is required",
        severity: "block",
        constraintName: "validBoardName",
        overrideable: false,
      },
    ],
    "boardType": [
      {
        message: "Board type must be valid",
        severity: "block",
        constraintName: "validBoardType",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "BoardAnnotation": {
    "boardId": [
      {
        message: "Board ID is required",
        severity: "block",
        constraintName: "requireBoard",
        overrideable: false,
      },
    ],
  },
  "BoardProjection": {
    "boardId": [
      {
        message: "Board ID is required",
        severity: "block",
        constraintName: "requireBoard",
        overrideable: false,
      },
    ],
    "entityId": [
      {
        message: "Entity ID is required",
        severity: "block",
        constraintName: "requireEntityId",
        overrideable: false,
      },
    ],
    "entityType": [
      {
        message: "Entity type is required",
        severity: "block",
        constraintName: "requireEntityType",
        overrideable: false,
      },
    ],
    "height": [
      {
        message: "Height must be positive",
        severity: "block",
        constraintName: "positiveHeight",
        overrideable: false,
      },
    ],
    "width": [
      {
        message: "Width must be positive",
        severity: "block",
        constraintName: "positiveWidth",
        overrideable: false,
      },
    ],
  },
  "Budget": {
    "allocatedAmount": [
      {
        message: "Cannot approve budget 'name' with zero allocated amount",
        severity: "block",
        constraintName: "blockApproveZero",
        overrideable: false,
      },
      {
        message: "Allocated amount cannot be negative",
        severity: "block",
        constraintName: "positiveAllocation",
        overrideable: false,
      },
      {
        message: "Adding 'line item name' would push spend past allocated amount",
        severity: "warn",
        constraintName: "warnExceedsTotal",
        overrideable: false,
      },
      {
        message: "Variance alert: actual spend (actual spent) exceeds budget by more than 10%",
        severity: "warn",
        constraintName: "warnLargeVariance",
        overrideable: false,
      },
      {
        message: "Budget 'name' is over by over amount",
        severity: "warn",
        constraintName: "warnOverBudget",
        overrideable: false,
      },
    ],
    "spentAmount": [
      {
        message: "Adding 'line item name' would push spend past allocated amount",
        severity: "warn",
        constraintName: "warnExceedsTotal",
        overrideable: false,
      },
      {
        message: "Budget 'name' is over by over amount",
        severity: "warn",
        constraintName: "warnOverBudget",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid budget status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Budget 'name' is over by over amount",
        severity: "warn",
        constraintName: "warnOverBudget",
        overrideable: false,
      },
    ],
  },
  "BudgetAlert": {
    "alertType": [
      {
        message: "Invalid alert type",
        severity: "block",
        constraintName: "validAlertType",
        overrideable: false,
      },
    ],
  },
  "BudgetLineItem": {
    "actualAmount": [
      {
        message: "Actual amount must be non-negative",
        severity: "block",
        constraintName: "positiveActualAmount",
        overrideable: false,
      },
      {
        message: "Line item 'name' is over budget by variance amount",
        severity: "warn",
        constraintName: "warnOverBudgetItem",
        overrideable: false,
      },
    ],
    "budgetedAmount": [
      {
        message: "Budgeted amount must be non-negative",
        severity: "block",
        constraintName: "positiveBudgetedAmount",
        overrideable: false,
      },
      {
        message: "Line item 'name' is over budget by variance amount",
        severity: "warn",
        constraintName: "warnOverBudgetItem",
        overrideable: false,
      },
    ],
    "budgetId": [
      {
        message: "Budget ID is required",
        severity: "block",
        constraintName: "validBudgetId",
        overrideable: false,
      },
    ],
    "category": [
      {
        message: "Category is required",
        severity: "block",
        constraintName: "validCategory",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Line item name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
    ],
    "sortOrder": [
      {
        message: "Sort order must be non-negative",
        severity: "block",
        constraintName: "positiveSortOrder",
        overrideable: false,
      },
    ],
  },
  "BulkCombineRule": {
    "matchCriteria": [
      {
        message: "Match criteria is required",
        severity: "block",
        constraintName: "requireMatchCriteria",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Bulk combine rule name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "BulkOrderRule": {
    "action": [
      {
        message: "Action must be discount or free_shipping",
        severity: "block",
        constraintName: "requireAction",
        overrideable: false,
      },
      {
        message: "Bulk order rule 'rule name' has discount action but 0% discount — verify this is intentional",
        severity: "warn",
        constraintName: "warnNoDiscount",
        overrideable: false,
      },
    ],
    "discountPercent": [
      {
        message: "Discount percent must be between 0 and 100",
        severity: "block",
        constraintName: "validDiscount",
        overrideable: false,
      },
      {
        message: "Discount increased from discount percent% to new pct% for rule 'rule name'",
        severity: "warn",
        constraintName: "warnDiscountIncrease",
        overrideable: false,
      },
      {
        message: "Bulk order rule 'rule name' has discount action but 0% discount — verify this is intentional",
        severity: "warn",
        constraintName: "warnNoDiscount",
        overrideable: false,
      },
    ],
    "isActive": [
      {
        message: "Deleting active bulk order rule 'rule name'",
        severity: "warn",
        constraintName: "warnActiveRule",
        overrideable: false,
      },
      {
        message: "Bulk order rule 'rule name' has discount action but 0% discount — verify this is intentional",
        severity: "warn",
        constraintName: "warnNoDiscount",
        overrideable: false,
      },
    ],
    "minimumQuantity": [
      {
        message: "Minimum quantity must be at least 1",
        severity: "block",
        constraintName: "requireMinimumQuantity",
        overrideable: false,
      },
    ],
    "ruleName": [
      {
        message: "Rule name is required",
        severity: "block",
        constraintName: "requireRuleName",
        overrideable: false,
      },
    ],
    "ruleType": [
      {
        message: "Rule type must be discount, free_shipping, or threshold",
        severity: "block",
        constraintName: "requireRuleType",
        overrideable: false,
      },
    ],
  },
  "CallPlanningSession": {
    "sourceType": [
      {
        message: "Invalid source type",
        severity: "block",
        constraintName: "validSourceType",
        overrideable: false,
      },
    ],
  },
  "CateringOrder": {
    "depositPaid": [
      {
        message: "Order order number is confirmed but deposit not yet paid",
        severity: "warn",
        constraintName: "warnNoDeposit",
        overrideable: false,
      },
      {
        message: "Delivering order order number with outstanding deposit",
        severity: "warn",
        constraintName: "warnNoDeposit",
        overrideable: false,
      },
      {
        message: "Confirming order order number without deposit payment",
        severity: "warn",
        constraintName: "warnNoDepositOnConfirm",
        overrideable: false,
      },
    ],
    "depositRequired": [
      {
        message: "Order order number is confirmed but deposit not yet paid",
        severity: "warn",
        constraintName: "warnNoDeposit",
        overrideable: false,
      },
      {
        message: "Delivering order order number with outstanding deposit",
        severity: "warn",
        constraintName: "warnNoDeposit",
        overrideable: false,
      },
      {
        message: "Confirming order order number without deposit payment",
        severity: "warn",
        constraintName: "warnNoDepositOnConfirm",
        overrideable: false,
      },
    ],
    "guestCount": [
      {
        message: "Guest count must be non-negative",
        severity: "block",
        constraintName: "positiveGuestCount",
        overrideable: false,
      },
      {
        message: "Guest count changing significantly from guest count to new count",
        severity: "warn",
        constraintName: "warnGuestCountChange",
        overrideable: false,
      },
    ],
    "orderNumber": [
      {
        message: "Order number is required",
        severity: "block",
        constraintName: "validOrderNumber",
        overrideable: false,
      },
    ],
    "orderStatus": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Cancelling order status order order number",
        severity: "warn",
        constraintName: "warnCancelConfirmed",
        overrideable: false,
      },
      {
        message: "Order order number is confirmed but deposit not yet paid",
        severity: "warn",
        constraintName: "warnNoDeposit",
        overrideable: false,
      },
    ],
    "staffAssigned": [
      {
        message: "Order order number needs needed more staff (assigned/required)",
        severity: "warn",
        constraintName: "warnUnstaffed",
        overrideable: false,
      },
    ],
    "staffRequired": [
      {
        message: "Order order number needs needed more staff (assigned/required)",
        severity: "warn",
        constraintName: "warnUnstaffed",
        overrideable: false,
      },
    ],
    "totalAmount": [
      {
        message: "Total amount must be non-negative",
        severity: "block",
        constraintName: "positiveTotalAmount",
        overrideable: false,
      },
    ],
  },
  "ChartOfAccount": {
    "accountName": [
      {
        message: "Account name is required",
        severity: "block",
        constraintName: "requireAccountName",
        overrideable: false,
      },
    ],
    "accountNumber": [
      {
        message: "Account number is required",
        severity: "block",
        constraintName: "requireAccountNumber",
        overrideable: false,
      },
    ],
    "accountType": [
      {
        message: "Account type is required",
        severity: "block",
        constraintName: "requireAccountType",
        overrideable: false,
      },
      {
        message: "Invalid account type",
        severity: "block",
        constraintName: "validAccountType",
        overrideable: false,
      },
    ],
  },
  "Client": {
    "assignedTo": [
      {
        message: "Archiving client 'display name' who is assigned to a sales rep",
        severity: "warn",
        constraintName: "warnArchiveWithAssignment",
        overrideable: false,
      },
    ],
    "clientType": [
      {
        message: "Client type must be 'company' or 'individual'",
        severity: "block",
        constraintName: "validClientType",
        overrideable: false,
      },
    ],
    "defaultPaymentTerms": [
      {
        message: "Payment terms must be non-negative",
        severity: "block",
        constraintName: "validPaymentTerms",
        overrideable: false,
      },
    ],
    "email": [
      {
        message: "Client 'display name' has no email or phone on file",
        severity: "warn",
        constraintName: "warnNoEmail",
        overrideable: false,
      },
    ],
    "phone": [
      {
        message: "Client 'display name' has no email or phone on file",
        severity: "warn",
        constraintName: "warnNoEmail",
        overrideable: false,
      },
    ],
    "source": [
      {
        message: "Client 'display name' has no lead source recorded",
        severity: "warn",
        constraintName: "warnNoSource",
        overrideable: false,
      },
    ],
  },
  "ClientContact": {
    "clientId": [
      {
        message: "Client ID is required",
        severity: "block",
        constraintName: "validClientId",
        overrideable: false,
      },
    ],
    "email": [
      {
        message: "Contact 'full name' has no email or phone number",
        severity: "warn",
        constraintName: "warnNoContactInfo",
        overrideable: false,
      },
    ],
    "firstName": [
      {
        message: "First name is required",
        severity: "block",
        constraintName: "validFirstName",
        overrideable: false,
      },
    ],
    "isPrimary": [
      {
        message: "Removing primary contact 'full name' from client",
        severity: "warn",
        constraintName: "warnRemovePrimary",
        overrideable: false,
      },
    ],
    "lastName": [
      {
        message: "Last name is required",
        severity: "block",
        constraintName: "validLastName",
        overrideable: false,
      },
    ],
    "phone": [
      {
        message: "Contact 'full name' has no email or phone number",
        severity: "warn",
        constraintName: "warnNoContactInfo",
        overrideable: false,
      },
    ],
    "phoneMobile": [
      {
        message: "Contact 'full name' has no email or phone number",
        severity: "warn",
        constraintName: "warnNoContactInfo",
        overrideable: false,
      },
    ],
  },
  "ClientInteraction": {
    "clientId": [
      {
        message: "Interaction 'subject' is not linked to any client or lead",
        severity: "warn",
        constraintName: "warnNoClientOrLead",
        overrideable: false,
      },
    ],
    "employeeId": [
      {
        message: "Employee ID is required",
        severity: "block",
        constraintName: "validEmployeeId",
        overrideable: false,
      },
    ],
    "followUpCompleted": [
      {
        message: "Follow-up for 'subject' is overdue (due follow up date)",
        severity: "warn",
        constraintName: "warnOverdueFollowUp",
        overrideable: false,
      },
    ],
    "followUpDate": [
      {
        message: "Completing interaction 'subject' that has no follow-up date set",
        severity: "warn",
        constraintName: "warnNoFollowUp",
        overrideable: false,
      },
      {
        message: "Follow-up for 'subject' is overdue (due follow up date)",
        severity: "warn",
        constraintName: "warnOverdueFollowUp",
        overrideable: false,
      },
    ],
    "interactionType": [
      {
        message: "Interaction type must be 'call', 'email', 'meeting', or 'note'",
        severity: "block",
        constraintName: "validInteractionType",
        overrideable: false,
      },
    ],
    "leadId": [
      {
        message: "Interaction 'subject' is not linked to any client or lead",
        severity: "warn",
        constraintName: "warnNoClientOrLead",
        overrideable: false,
      },
    ],
    "priority": [
      {
        message: "Invalid priority level",
        severity: "block",
        constraintName: "validPriority",
        overrideable: false,
      },
    ],
    "subject": [
      {
        message: "Subject is required",
        severity: "block",
        constraintName: "validSubject",
        overrideable: false,
      },
    ],
  },
  "ClientPreference": {
    "clientId": [
      {
        message: "Client ID is required",
        severity: "block",
        constraintName: "validClientId",
        overrideable: false,
      },
    ],
    "preferenceKey": [
      {
        message: "Preference key is required",
        severity: "block",
        constraintName: "validPreferenceKey",
        overrideable: false,
      },
    ],
    "preferenceType": [
      {
        message: "Preference type is required",
        severity: "block",
        constraintName: "validPreferenceType",
        overrideable: false,
      },
    ],
  },
  "CollectionAction": {
    "direction": [
      {
        message: "Invalid direction",
        severity: "block",
        constraintName: "valid_direction",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid status",
        severity: "block",
        constraintName: "valid_status",
        overrideable: false,
      },
    ],
  },
  "CollectionCase": {
    "collectedAmount": [
      {
        message: "Collected amount cannot exceed original",
        severity: "block",
        constraintName: "collected_valid",
        overrideable: false,
      },
    ],
    "originalAmount": [
      {
        message: "Original amount must be positive",
        severity: "block",
        constraintName: "amount_positive",
        overrideable: false,
      },
      {
        message: "Collected amount cannot exceed original",
        severity: "block",
        constraintName: "collected_valid",
        overrideable: false,
      },
    ],
  },
  "CollectionPaymentPlan": {
    "completedInstallments": [
      {
        message: "Completed cannot exceed total",
        severity: "block",
        constraintName: "completed_valid",
        overrideable: false,
      },
    ],
    "installmentAmount": [
      {
        message: "Amounts must be positive",
        severity: "block",
        constraintName: "amount_positive",
        overrideable: false,
      },
    ],
    "installments": [
      {
        message: "Completed cannot exceed total",
        severity: "block",
        constraintName: "completed_valid",
        overrideable: false,
      },
      {
        message: "Must have at least one installment",
        severity: "block",
        constraintName: "installments_valid",
        overrideable: false,
      },
    ],
    "totalAmount": [
      {
        message: "Amounts must be positive",
        severity: "block",
        constraintName: "amount_positive",
        overrideable: false,
      },
    ],
  },
  "CommandBoard": {
    "name": [
      {
        message: "Board name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
      {
        message: "Renaming board from 'name' to 'new name'",
        severity: "warn",
        constraintName: "warnNameChange",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "CommandBoardCard": {
    "boardId": [
      {
        message: "Board ID is required",
        severity: "block",
        constraintName: "validBoardId",
        overrideable: false,
      },
    ],
    "cardType": [
      {
        message: "Invalid card type",
        severity: "block",
        constraintName: "validCardType",
        overrideable: false,
      },
    ],
    "height": [
      {
        message: "Card height must be positive",
        severity: "block",
        constraintName: "positiveHeight",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid card status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Card 'title' status changing from 'status' to 'new status'",
        severity: "warn",
        constraintName: "warnStatusChange",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Card title is required",
        severity: "block",
        constraintName: "validTitle",
        overrideable: false,
      },
    ],
    "width": [
      {
        message: "Card width must be positive",
        severity: "block",
        constraintName: "positiveWidth",
        overrideable: false,
      },
    ],
  },
  "CommandBoardConnection": {
    "boardId": [
      {
        message: "Board ID is required",
        severity: "block",
        constraintName: "validBoardId",
        overrideable: false,
      },
    ],
    "fromCardId": [
      {
        message: "Cannot connect a card to itself",
        severity: "block",
        constraintName: "noSelfConnection",
        overrideable: false,
      },
      {
        message: "Source card ID is required",
        severity: "block",
        constraintName: "validFromCardId",
        overrideable: false,
      },
    ],
    "relationshipType": [
      {
        message: "Invalid connection type",
        severity: "block",
        constraintName: "validRelationshipType",
        overrideable: false,
      },
    ],
    "toCardId": [
      {
        message: "Cannot connect a card to itself",
        severity: "block",
        constraintName: "noSelfConnection",
        overrideable: false,
      },
      {
        message: "Target card ID is required",
        severity: "block",
        constraintName: "validToCardId",
        overrideable: false,
      },
    ],
  },
  "CommandBoardGroup": {
    "boardId": [
      {
        message: "Board ID is required",
        severity: "block",
        constraintName: "validBoardId",
        overrideable: false,
      },
    ],
    "height": [
      {
        message: "Group height must be positive",
        severity: "block",
        constraintName: "positiveHeight",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Group name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
    ],
    "width": [
      {
        message: "Group width must be positive",
        severity: "block",
        constraintName: "positiveWidth",
        overrideable: false,
      },
    ],
  },
  "CommandBoardLayout": {
    "boardId": [
      {
        message: "Board ID is required",
        severity: "block",
        constraintName: "validBoardId",
        overrideable: false,
      },
    ],
    "gridSize": [
      {
        message: "Grid size must be positive",
        severity: "block",
        constraintName: "positiveGridSize",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Layout name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
    ],
    "userId": [
      {
        message: "User ID is required",
        severity: "block",
        constraintName: "validUserId",
        overrideable: false,
      },
    ],
  },
  "Container": {
    "capacityPortions": [
      {
        message: "Portion capacity cannot be negative",
        severity: "block",
        constraintName: "positivePortions",
        overrideable: false,
      },
      {
        message: "Container 'name' has no capacity values configured",
        severity: "warn",
        constraintName: "warnNoCapacity",
        overrideable: false,
      },
    ],
    "capacityVolumeMl": [
      {
        message: "Volume capacity cannot be negative",
        severity: "block",
        constraintName: "positiveVolume",
        overrideable: false,
      },
      {
        message: "Container 'name' has no capacity values configured",
        severity: "warn",
        constraintName: "warnNoCapacity",
        overrideable: false,
      },
    ],
    "capacityWeightG": [
      {
        message: "Weight capacity cannot be negative",
        severity: "block",
        constraintName: "positiveWeight",
        overrideable: false,
      },
      {
        message: "Container 'name' has no capacity values configured",
        severity: "warn",
        constraintName: "warnNoCapacity",
        overrideable: false,
      },
    ],
    "isActive": [
      {
        message: "Container 'name' has no capacity values configured",
        severity: "warn",
        constraintName: "warnNoCapacity",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Container name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "ContractSignature": {
    "contractId": [
      {
        message: "Contract ID is required",
        severity: "block",
        constraintName: "requireContract",
        overrideable: false,
      },
    ],
    "signatureData": [
      {
        message: "Signature data is required",
        severity: "block",
        constraintName: "requireSignatureData",
        overrideable: false,
      },
    ],
    "signerName": [
      {
        message: "Signer name is required",
        severity: "block",
        constraintName: "requireSignerName",
        overrideable: false,
      },
    ],
  },
  "CorrectiveAction": {
    "description": [
      {
        message: "Description is required",
        severity: "block",
        constraintName: "requireDescription",
        overrideable: false,
      },
    ],
    "sourceId": [
      {
        message: "Source ID is required",
        severity: "block",
        constraintName: "requireSourceId",
        overrideable: false,
      },
    ],
    "sourceType": [
      {
        message: "Source type is required",
        severity: "block",
        constraintName: "requireSourceType",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid corrective action status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "CrmScoringRule": {
    "condition": [
      {
        message: "Condition is required",
        severity: "block",
        constraintName: "requireCondition",
        overrideable: false,
      },
    ],
    "field": [
      {
        message: "Field is required",
        severity: "block",
        constraintName: "requireField",
        overrideable: false,
      },
    ],
    "points": [
      {
        message: "Scoring rule 'rule name' has extreme point value (points); verify this is intentional",
        severity: "warn",
        constraintName: "warnExtremePoints",
        overrideable: false,
      },
    ],
    "ruleName": [
      {
        message: "Rule name is required",
        severity: "block",
        constraintName: "requireRuleName",
        overrideable: false,
      },
    ],
  },
  "CycleCountRecord": {
    "variancePct": [
      {
        message: "Verifying record for 'item name' with large variance (variance pct%)",
        severity: "warn",
        constraintName: "warnLargeVariance",
        overrideable: false,
      },
    ],
  },
  "CycleCountSession": {
    "countedItems": [
      {
        message: "Cancelling in-progress session 'session name' with counted items items already counted",
        severity: "warn",
        constraintName: "warnCancelInProgress",
        overrideable: false,
      },
      {
        message: "Completing session 'session name' with only counted items/total items items counted",
        severity: "warn",
        constraintName: "warnIncomplete",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid cycle count session status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Cancelling in-progress session 'session name' with counted items items already counted",
        severity: "warn",
        constraintName: "warnCancelInProgress",
        overrideable: false,
      },
    ],
    "totalItems": [
      {
        message: "Completing session 'session name' with only counted items/total items items counted",
        severity: "warn",
        constraintName: "warnIncomplete",
        overrideable: false,
      },
    ],
  },
  "Deal": {
    "probability": [
      {
        message: "Probability must be between 0 and 100",
        severity: "block",
        constraintName: "validProbability",
        overrideable: false,
      },
    ],
    "stage": [
      {
        message: "Invalid deal stage",
        severity: "block",
        constraintName: "validStage",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid deal status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "value": [
      {
        message: "Deal value cannot be negative",
        severity: "block",
        constraintName: "positiveValue",
        overrideable: false,
      },
    ],
  },
  "DeliveryRoute": {
    "name": [
      {
        message: "Route name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid delivery route status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "totalDistance": [
      {
        message: "Distance cannot be negative",
        severity: "block",
        constraintName: "distancePositive",
        overrideable: false,
      },
    ],
  },
  "DisciplinaryAction": {
    "actionType": [
      {
        message: "Action type is required",
        severity: "block",
        constraintName: "requireActionType",
        overrideable: false,
      },
    ],
    "reason": [
      {
        message: "Reason is required",
        severity: "block",
        constraintName: "requireReason",
        overrideable: false,
      },
    ],
    "severity": [
      {
        message: "Invalid disciplinary action severity",
        severity: "block",
        constraintName: "validSeverity",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid disciplinary action status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "Dish": {
    "costPerPerson": [
      {
        message: "Cost per person cannot be negative",
        severity: "block",
        constraintName: "positiveCost",
        overrideable: false,
      },
      {
        message: "Dish cost (cost per person) exceeds price (price per person)",
        severity: "warn",
        constraintName: "warnCostExceedsPrice",
        overrideable: false,
      },
      {
        message: "Dish 'name' has a low margin of margin percent%",
        severity: "warn",
        constraintName: "warnLowMargin",
        overrideable: false,
      },
    ],
    "isActive": [
      {
        message: "Active dish 'name' has no price set",
        severity: "warn",
        constraintName: "warnNoPrice",
        overrideable: false,
      },
    ],
    "maxPrepLeadDays": [
      {
        message: "Max prep lead days must be >= min prep lead days",
        severity: "block",
        constraintName: "leadDaysOrder",
        overrideable: false,
      },
      {
        message: "Maximum prep lead days cannot be negative",
        severity: "block",
        constraintName: "positiveMaxLeadDays",
        overrideable: false,
      },
    ],
    "minPrepLeadDays": [
      {
        message: "Max prep lead days must be >= min prep lead days",
        severity: "block",
        constraintName: "leadDaysOrder",
        overrideable: false,
      },
      {
        message: "Minimum prep lead days cannot be negative",
        severity: "block",
        constraintName: "positiveMinLeadDays",
        overrideable: false,
      },
      {
        message: "Dish requires days days advance notice",
        severity: "warn",
        constraintName: "warnLongLeadTime",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Dish name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
    ],
    "pricePerPerson": [
      {
        message: "Price per person cannot be negative",
        severity: "block",
        constraintName: "positivePrice",
        overrideable: false,
      },
      {
        message: "Dish cost (cost per person) exceeds price (price per person)",
        severity: "warn",
        constraintName: "warnCostExceedsPrice",
        overrideable: false,
      },
      {
        message: "Dish 'name' has a low margin of margin percent%",
        severity: "warn",
        constraintName: "warnLowMargin",
        overrideable: false,
      },
      {
        message: "Active dish 'name' has no price set",
        severity: "warn",
        constraintName: "warnNoPrice",
        overrideable: false,
      },
      {
        message: "Price decreased from price per person to new price",
        severity: "warn",
        constraintName: "warnPriceDecrease",
        overrideable: false,
      },
    ],
    "seasonEndMonth": [
      {
        message: "Season months must be between 0 and 12",
        severity: "block",
        constraintName: "validSeasonMonths",
        overrideable: false,
      },
    ],
    "seasonStartMonth": [
      {
        message: "Season months must be between 0 and 12",
        severity: "block",
        constraintName: "validSeasonMonths",
        overrideable: false,
      },
    ],
  },
  "Document": {
    "entityId": [
      {
        message: "Document 'name' is not linked to any entity",
        severity: "warn",
        constraintName: "warnUnlinkedDocument",
        overrideable: false,
      },
    ],
    "entityType": [
      {
        message: "Document 'name' is not linked to any entity",
        severity: "warn",
        constraintName: "warnUnlinkedDocument",
        overrideable: false,
      },
    ],
    "fileSizeBytes": [
      {
        message: "File size must be non-negative",
        severity: "block",
        constraintName: "positiveFileSize",
        overrideable: false,
      },
    ],
    "fileUrl": [
      {
        message: "File URL is required",
        severity: "block",
        constraintName: "requireFileUrl",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Document name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "DocumentVersion": {
    "content": [
      {
        message: "Content is required",
        severity: "block",
        constraintName: "requireContent",
        overrideable: false,
      },
    ],
    "documentId": [
      {
        message: "Document ID is required",
        severity: "block",
        constraintName: "requireDocument",
        overrideable: false,
      },
    ],
    "versionNumber": [
      {
        message: "Version number must be positive",
        severity: "block",
        constraintName: "positiveVersion",
        overrideable: false,
      },
    ],
  },
  "Driver": {
    "licenseExpiry": [
      {
        message: "Driver 'name' has an expired license — suspend or renew before dispatching",
        severity: "warn",
        constraintName: "warnExpiredLicense",
        overrideable: false,
      },
      {
        message: "Driver 'name' license expiring within 30 days",
        severity: "warn",
        constraintName: "warnLicenseExpiring",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid driver status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Driver 'name' has an expired license — suspend or renew before dispatching",
        severity: "warn",
        constraintName: "warnExpiredLicense",
        overrideable: false,
      },
      {
        message: "Driver 'name' license expiring within 30 days",
        severity: "warn",
        constraintName: "warnLicenseExpiring",
        overrideable: false,
      },
    ],
  },
  "EmailTemplate": {
    "name": [
      {
        message: "Template name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "subject": [
      {
        message: "Template subject is required",
        severity: "block",
        constraintName: "requireSubject",
        overrideable: false,
      },
    ],
  },
  "EmailWorkflow": {
    "name": [
      {
        message: "Workflow name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "EmployeeAvailability": {
    "dayOfWeek": [
      {
        message: "Day of week must be between 0 and 6",
        severity: "block",
        constraintName: "validDayOfWeek",
        overrideable: false,
      },
    ],
    "employeeId": [
      {
        message: "Employee ID is required",
        severity: "block",
        constraintName: "requireEmployee",
        overrideable: false,
      },
    ],
    "endTime": [
      {
        message: "End time is required",
        severity: "block",
        constraintName: "requireEndTime",
        overrideable: false,
      },
    ],
    "startTime": [
      {
        message: "Start time is required",
        severity: "block",
        constraintName: "requireStartTime",
        overrideable: false,
      },
    ],
  },
  "EmployeeCertification": {
    "certificationName": [
      {
        message: "Certification name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "certificationType": [
      {
        message: "Certification type is required",
        severity: "block",
        constraintName: "requireType",
        overrideable: false,
      },
    ],
    "employeeId": [
      {
        message: "Employee ID is required",
        severity: "block",
        constraintName: "requireEmployee",
        overrideable: false,
      },
    ],
    "issuedDate": [
      {
        message: "Issued date is required",
        severity: "block",
        constraintName: "requireIssuedDate",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid certification status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "EmployeeDeduction": {
    "amount": [
      {
        message: "Deduction amount cannot be negative",
        severity: "block",
        constraintName: "nonNegativeAmount",
        overrideable: false,
      },
    ],
    "employeeId": [
      {
        message: "Employee ID is required",
        severity: "block",
        constraintName: "requireEmployee",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Deduction name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "percentage": [
      {
        message: "Percentage must be between 0 and 100",
        severity: "block",
        constraintName: "validPercentage",
        overrideable: false,
      },
    ],
    "type": [
      {
        message: "Deduction type is required",
        severity: "block",
        constraintName: "requireType",
        overrideable: false,
      },
    ],
  },
  "EntityVersion": {
    "changeType": [
      {
        message: "Change type must be valid",
        severity: "block",
        constraintName: "validChangeType",
        overrideable: false,
      },
    ],
    "snapshotData": [
      {
        message: "Snapshot data is required",
        severity: "block",
        constraintName: "validSnapshot",
        overrideable: false,
      },
    ],
    "versionNumber": [
      {
        message: "Version number must be positive",
        severity: "block",
        constraintName: "validVersionNumber",
        overrideable: false,
      },
      {
        message: "Restoring to old version #version - current changes may be lost",
        severity: "warn",
        constraintName: "warnRestoreOldVersion",
        overrideable: false,
      },
    ],
  },
  "Equipment": {
    "condition": [
      {
        message: "Invalid equipment condition",
        severity: "block",
        constraintName: "validCondition",
        overrideable: false,
      },
      {
        message: "Equipment 'name' condition has degraded to poor - schedule maintenance",
        severity: "warn",
        constraintName: "warnConditionDegraded",
        overrideable: false,
      },
      {
        message: "Equipment 'name' is in poor condition and should be inspected",
        severity: "warn",
        constraintName: "warnPoorCondition",
        overrideable: false,
      },
      {
        message: "Retiring equipment 'name' in condition condition - consider transfer or sale",
        severity: "warn",
        constraintName: "warnRetireFunctionalEquipment",
        overrideable: false,
      },
    ],
    "maintenanceIntervalDays": [
      {
        message: "Maintenance interval must be positive",
        severity: "block",
        constraintName: "positiveMaintenanceInterval",
        overrideable: false,
      },
    ],
    "maxUsageHours": [
      {
        message: "Max usage hours must be positive",
        severity: "block",
        constraintName: "positiveMaxUsage",
        overrideable: false,
      },
      {
        message: "Equipment 'name' has reached usage% of its recommended usage limit",
        severity: "warn",
        constraintName: "warnHighUsage",
        overrideable: false,
      },
    ],
    "nextMaintenanceDate": [
      {
        message: "Equipment 'name' is due for maintenance in days until maintenance day(s)",
        severity: "warn",
        constraintName: "warnMaintenanceDue",
        overrideable: false,
      },
      {
        message: "Equipment 'name' is overdue for maintenance by days day(s)",
        severity: "warn",
        constraintName: "warnOverdueMaintenance",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Scheduling maintenance type maintenance for 'name' - check for event conflicts",
        severity: "warn",
        constraintName: "warnConflictWithEvents",
        overrideable: false,
      },
      {
        message: "Taking 'name' out of service - ensure no events are dependent on it",
        severity: "warn",
        constraintName: "warnDeactivateActiveEquipment",
        overrideable: false,
      },
      {
        message: "Equipment 'name' has reached usage% of its recommended usage limit",
        severity: "warn",
        constraintName: "warnHighUsage",
        overrideable: false,
      },
      {
        message: "Equipment 'name' is due for maintenance in days until maintenance day(s)",
        severity: "warn",
        constraintName: "warnMaintenanceDue",
        overrideable: false,
      },
      {
        message: "Equipment 'name' is overdue for maintenance by days day(s)",
        severity: "warn",
        constraintName: "warnOverdueMaintenance",
        overrideable: false,
      },
      {
        message: "Equipment 'name' is in poor condition and should be inspected",
        severity: "warn",
        constraintName: "warnPoorCondition",
        overrideable: false,
      },
    ],
    "type": [
      {
        message: "Invalid equipment type",
        severity: "block",
        constraintName: "validEquipmentType",
        overrideable: false,
      },
    ],
    "usageHours": [
      {
        message: "Equipment 'name' has reached usage% of its recommended usage limit",
        severity: "warn",
        constraintName: "warnHighUsage",
        overrideable: false,
      },
    ],
  },
  "Event": {
    "eventType": [
      {
        message: "Event type is required",
        severity: "block",
        constraintName: "validEventType",
        overrideable: false,
      },
    ],
    "guestCount": [
      {
        message: "Cannot confirm event 'title' with no guest count",
        severity: "block",
        constraintName: "blockNoGuestCount",
        overrideable: false,
      },
      {
        message: "Guest count must be positive",
        severity: "block",
        constraintName: "positiveGuestCount",
        overrideable: false,
      },
      {
        message: "Large event with guest count guests - verify capacity and staffing",
        severity: "warn",
        constraintName: "warnLargeGuestCount",
        overrideable: false,
      },
      {
        message: "Guest count changing significantly from guest count to new count",
        severity: "warn",
        constraintName: "warnLargeGuestCountChange",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Event title is required",
        severity: "block",
        constraintName: "validTitle",
        overrideable: false,
      },
    ],
    "venueName": [
      {
        message: "Changing venue from 'venue name' to 'new venue'",
        severity: "warn",
        constraintName: "warnLocationChange",
        overrideable: false,
      },
    ],
  },
  "EventBudget": {
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "validEventId",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "totalActualAmount": [
      {
        message: "Budget approaching limit — spent of budget",
        severity: "warn",
        constraintName: "warnBudgetOverrunRisk",
        overrideable: false,
      },
      {
        message: "Budget is over by variance amount (variance percentage%)",
        severity: "warn",
        constraintName: "warnOverBudget",
        overrideable: true,
      },
    ],
    "totalBudgetAmount": [
      {
        message: "Cannot finalize budget - variance (variance pct%) exceeds 20% threshold",
        severity: "block",
        constraintName: "blockFinalizeHighVariance",
        overrideable: false,
      },
      {
        message: "Cannot approve budget with no budgeted amount",
        severity: "block",
        constraintName: "blockNoLineItems",
        overrideable: false,
      },
      {
        message: "Total budget amount must be non-negative",
        severity: "block",
        constraintName: "positiveBudget",
        overrideable: false,
      },
      {
        message: "Budget increasing by more than 25% (from total budget amount to new budget)",
        severity: "warn",
        constraintName: "warnBudgetIncrease",
        overrideable: false,
      },
      {
        message: "Budget approaching limit — spent of budget",
        severity: "warn",
        constraintName: "warnBudgetOverrunRisk",
        overrideable: false,
      },
      {
        message: "Finalizing budget with variance pct% variance",
        severity: "warn",
        constraintName: "warnFinalizeWithVariance",
        overrideable: false,
      },
      {
        message: "Budget variance exceeds 10% threshold (variance pct%)",
        severity: "warn",
        constraintName: "warnHighVariance",
        overrideable: false,
      },
      {
        message: "Budget is over by variance amount (variance percentage%)",
        severity: "warn",
        constraintName: "warnOverBudget",
        overrideable: true,
      },
    ],
    "varianceAmount": [
      {
        message: "Cannot finalize budget - variance (variance pct%) exceeds 20% threshold",
        severity: "block",
        constraintName: "blockFinalizeHighVariance",
        overrideable: false,
      },
      {
        message: "Finalizing budget with variance pct% variance",
        severity: "warn",
        constraintName: "warnFinalizeWithVariance",
        overrideable: false,
      },
      {
        message: "Budget variance exceeds 10% threshold (variance pct%)",
        severity: "warn",
        constraintName: "warnHighVariance",
        overrideable: false,
      },
    ],
  },
  "EventContract": {
    "clientId": [
      {
        message: "Client ID is required",
        severity: "block",
        constraintName: "requireClient",
        overrideable: false,
      },
    ],
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "requireEvent",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "EventDish": {
    "dishId": [
      {
        message: "Dish ID is required",
        severity: "block",
        constraintName: "requireDish",
        overrideable: false,
      },
    ],
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "requireEvent",
        overrideable: false,
      },
    ],
    "quantityServings": [
      {
        message: "Quantity must be positive",
        severity: "block",
        constraintName: "positiveQuantity",
        overrideable: false,
      },
    ],
  },
  "EventFollowup": {
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "requireEvent",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be pending, done, or cancelled",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "taskType": [
      {
        message: "Followup type is required",
        severity: "block",
        constraintName: "requireType",
        overrideable: false,
      },
    ],
  },
  "EventGuest": {
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "requireEvent",
        overrideable: false,
      },
    ],
    "guestName": [
      {
        message: "Guest name is required",
        severity: "block",
        constraintName: "requireGuestName",
        overrideable: false,
      },
    ],
  },
  "EventImport": {
    "fileName": [
      {
        message: "File name is required",
        severity: "block",
        constraintName: "requireFileName",
        overrideable: false,
      },
    ],
    "fileType": [
      {
        message: "Import file type is required",
        severity: "block",
        constraintName: "requireFileType",
        overrideable: false,
      },
    ],
    "importedRows": [
      {
        message: "Imported rows cannot be negative",
        severity: "block",
        constraintName: "nonNegativeImportedRows",
        overrideable: false,
      },
    ],
    "parseStatus": [
      {
        message: "Status must be pending, parsing, parsed, or failed",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "totalRows": [
      {
        message: "Total rows cannot be negative",
        severity: "block",
        constraintName: "nonNegativeRows",
        overrideable: false,
      },
    ],
  },
  "EventImportWorkflow": {
    "idempotencyKey": [
      {
        message: "Idempotency key is required for workflow tracking",
        severity: "block",
        constraintName: "hasIdempotencyKey",
        overrideable: false,
      },
    ],
  },
  "EventPlanningDraft": {
    "budgetMax": [
      {
        message: "Invalid budget range",
        severity: "block",
        constraintName: "validBudgetRange",
        overrideable: false,
      },
    ],
    "budgetMin": [
      {
        message: "Invalid budget range",
        severity: "block",
        constraintName: "validBudgetRange",
        overrideable: false,
      },
    ],
    "clientName": [
      {
        message: "Draft missing client name",
        severity: "warn",
        constraintName: "warnMissingClientName",
        overrideable: false,
      },
    ],
    "eventDate": [
      {
        message: "Draft missing event date",
        severity: "warn",
        constraintName: "warnMissingEventDate",
        overrideable: false,
      },
    ],
    "guestCount": [
      {
        message: "Draft missing guest count",
        severity: "warn",
        constraintName: "warnMissingGuestCount",
        overrideable: false,
      },
    ],
    "guestCountMax": [
      {
        message: "Invalid guest count range",
        severity: "block",
        constraintName: "validGuestCountRange",
        overrideable: false,
      },
      {
        message: "Draft missing guest count",
        severity: "warn",
        constraintName: "warnMissingGuestCount",
        overrideable: false,
      },
    ],
    "guestCountMin": [
      {
        message: "Invalid guest count range",
        severity: "block",
        constraintName: "validGuestCountRange",
        overrideable: false,
      },
      {
        message: "Draft missing guest count",
        severity: "warn",
        constraintName: "warnMissingGuestCount",
        overrideable: false,
      },
    ],
    "overallConfidence": [
      {
        message: "Draft has low overall confidence (confidence%)",
        severity: "warn",
        constraintName: "warnLowConfidence",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid draft status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "EventProfitability": {
    "actualGrossMargin": [
      {
        message: "Event profitability is negative (actual gross margin pct%)",
        severity: "warn",
        constraintName: "warnNegativeMargin",
        overrideable: false,
      },
    ],
    "actualRevenue": [
      {
        message: "Event profitability is negative (actual gross margin pct%)",
        severity: "warn",
        constraintName: "warnNegativeMargin",
        overrideable: false,
      },
    ],
    "budgetedTotalCost": [
      {
        message: "Total cost variance exceeds 10% of budget",
        severity: "warn",
        constraintName: "warnHighCostVariance",
        overrideable: false,
      },
    ],
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "validEventId",
        overrideable: false,
      },
    ],
    "totalCostVariance": [
      {
        message: "Total cost variance exceeds 10% of budget",
        severity: "warn",
        constraintName: "warnHighCostVariance",
        overrideable: false,
      },
    ],
  },
  "EventReport": {
    "completion": [
      {
        message: "Completion must be between 0 and 100",
        severity: "block",
        constraintName: "validCompletion",
        overrideable: false,
      },
      {
        message: "Submitting report 'name' at completion% completion",
        severity: "warn",
        constraintName: "warnIncomplete",
        overrideable: false,
      },
      {
        message: "Report 'name' is less than 50% complete",
        severity: "warn",
        constraintName: "warnLowCompletion",
        overrideable: false,
      },
    ],
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "validEventId",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Report name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Report 'name' is less than 50% complete",
        severity: "warn",
        constraintName: "warnLowCompletion",
        overrideable: false,
      },
    ],
  },
  "EventStaff": {
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "requireEvent",
        overrideable: false,
      },
    ],
    "staffMemberId": [
      {
        message: "Staff member ID is required",
        severity: "block",
        constraintName: "requireStaffMember",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "EventSummary": {
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "validEventId",
        overrideable: false,
      },
    ],
  },
  "EventTimeline": {
    "description": [
      {
        message: "Timeline entry description is required",
        severity: "block",
        constraintName: "requireDescription",
        overrideable: false,
      },
    ],
    "durationMinutes": [
      {
        message: "Duration cannot be negative",
        severity: "block",
        constraintName: "positiveDuration",
        overrideable: false,
      },
    ],
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "requireEvent",
        overrideable: false,
      },
    ],
  },
  "EventTimelineItem": {
    "itemType": [
      {
        message: "Invalid timeline item type",
        severity: "block",
        constraintName: "validItemType",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid timeline item status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "EventWaitlistEntry": {
    "guestName": [
      {
        message: "Guest name is required",
        severity: "block",
        constraintName: "requireGuestName",
        overrideable: false,
      },
    ],
    "partySize": [
      {
        message: "Party size must be at least 1",
        severity: "block",
        constraintName: "positivePartySize",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid waitlist status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "Facility": {
    "facilityType": [
      {
        message: "Invalid facility type",
        severity: "block",
        constraintName: "validFacilityType",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid facility status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "FacilityArea": {
    "areaType": [
      {
        message: "Invalid area type",
        severity: "block",
        constraintName: "validAreaType",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid area status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "FacilityAsset": {
    "assetType": [
      {
        message: "Invalid asset type",
        severity: "block",
        constraintName: "validAssetType",
        overrideable: false,
      },
    ],
    "nextMaintenanceAt": [
      {
        message: "Asset 'name' is overdue for maintenance",
        severity: "warn",
        constraintName: "warnMaintenanceOverdue",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid asset status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Asset 'name' is overdue for maintenance",
        severity: "warn",
        constraintName: "warnMaintenanceOverdue",
        overrideable: false,
      },
      {
        message: "Retiring operational asset 'name' — verify no active assignments",
        severity: "warn",
        constraintName: "warnRetireOperational",
        overrideable: false,
      },
    ],
  },
  "FacilitySchedule": {
    "scheduleType": [
      {
        message: "Invalid schedule type",
        severity: "block",
        constraintName: "validScheduleType",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid schedule status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "FacilityWorkOrder": {
    "category": [
      {
        message: "Invalid category",
        severity: "block",
        constraintName: "validCategory",
        overrideable: false,
      },
    ],
    "priority": [
      {
        message: "Invalid priority",
        severity: "block",
        constraintName: "validPriority",
        overrideable: false,
      },
    ],
    "scheduledDate": [
      {
        message: "Facility work order 'title' is past scheduled date",
        severity: "warn",
        constraintName: "warnOverdue",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid work order status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Facility work order 'title' is past scheduled date",
        severity: "warn",
        constraintName: "warnOverdue",
        overrideable: false,
      },
    ],
  },
  "FeatureFlag": {
    "flagKey": [
      {
        message: "Flag key is required",
        severity: "block",
        constraintName: "requireFlagKey",
        overrideable: false,
      },
    ],
    "rolloutPercent": [
      {
        message: "Rollout percent must be between 0 and 100",
        severity: "block",
        constraintName: "rolloutInRange",
        overrideable: false,
      },
    ],
  },
  "ForecastInput": {
    "actualUsage": [
      {
        message: "Actual usage cannot be negative",
        severity: "block",
        constraintName: "nonNegativeUsage",
        overrideable: false,
      },
    ],
    "source": [
      {
        message: "Data source is required",
        severity: "block",
        constraintName: "requireSource",
        overrideable: false,
      },
    ],
  },
  "Ingredient": {
    "allergens": [
      {
        message: "Ingredient contains major allergen: allergens",
        severity: "warn",
        constraintName: "warnMajorAllergen",
        overrideable: false,
      },
    ],
    "inventoryItemId": [
      {
        message: "Ingredient 'name' is not linked to an inventory item",
        severity: "warn",
        constraintName: "warnNoInventoryItem",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Ingredient name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "shelfLifeDays": [
      {
        message: "Shelf life days cannot be negative",
        severity: "block",
        constraintName: "positiveShelfLife",
        overrideable: false,
      },
      {
        message: "Ingredient 'name' has no shelf life configured",
        severity: "warn",
        constraintName: "warnNoShelfLife",
        overrideable: false,
      },
    ],
  },
  "InteractionAttachment": {
    "fileName": [
      {
        message: "File name is required",
        severity: "block",
        constraintName: "requireFileName",
        overrideable: false,
      },
    ],
    "fileSize": [
      {
        message: "File size must be non-negative",
        severity: "block",
        constraintName: "positiveFileSize",
        overrideable: false,
      },
      {
        message: "Attachment 'file name' exceeds 10 MB (file size bytes)",
        severity: "warn",
        constraintName: "warnLargeFile",
        overrideable: false,
      },
    ],
    "fileUrl": [
      {
        message: "File URL is required",
        severity: "block",
        constraintName: "requireFileUrl",
        overrideable: false,
      },
    ],
    "interactionId": [
      {
        message: "Client interaction ID is required",
        severity: "block",
        constraintName: "requireInteractionId",
        overrideable: false,
      },
    ],
  },
  "InventoryAlert": {
    "alertType": [
      {
        message: "Invalid alert type",
        severity: "block",
        constraintName: "validAlertType",
        overrideable: false,
      },
    ],
    "severity": [
      {
        message: "Invalid alert severity",
        severity: "block",
        constraintName: "validSeverity",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid alert status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "InventoryForecast": {
    "confidence": [
      {
        message: "Confidence must be between 0 and 1",
        severity: "block",
        constraintName: "confidenceRange",
        overrideable: false,
      },
      {
        message: "Publishing low-confidence forecast (confidence) for item 'inventory item id'",
        severity: "warn",
        constraintName: "warnLowConfidence",
        overrideable: false,
      },
    ],
    "projectedQuantity": [
      {
        message: "Projected quantity cannot be negative",
        severity: "block",
        constraintName: "nonNegativeProjection",
        overrideable: false,
      },
    ],
  },
  "InventoryItem": {
    "parLevel": [
      {
        message: "Item 'name' is below par level (quantity on hand < par level)",
        severity: "warn",
        constraintName: "warnBelowPar",
        overrideable: false,
      },
      {
        message: "After consumption, 'name' will be below par - recommend reorder",
        severity: "warn",
        constraintName: "warnBelowParAfterConsume",
        overrideable: false,
      },
      {
        message: "After reservation, 'name' will be below par level",
        severity: "warn",
        constraintName: "warnBelowParAfterReserve",
        overrideable: false,
      },
    ],
    "quantityOnHand": [
      {
        message: "Cannot record waste of quantity unit of measure - only quantity on hand on hand",
        severity: "block",
        constraintName: "blockInsufficientForWaste",
        overrideable: false,
      },
      {
        message: "Cannot consume quantity unit of measure - only quantity on hand on hand",
        severity: "block",
        constraintName: "blockInsufficientStock",
        overrideable: false,
      },
      {
        message: "Item 'name' is below par level (quantity on hand < par level)",
        severity: "warn",
        constraintName: "warnBelowPar",
        overrideable: false,
      },
      {
        message: "After consumption, 'name' will be below par - recommend reorder",
        severity: "warn",
        constraintName: "warnBelowParAfterConsume",
        overrideable: false,
      },
      {
        message: "After reservation, 'name' will be below par level",
        severity: "warn",
        constraintName: "warnBelowParAfterReserve",
        overrideable: false,
      },
      {
        message: "Large negative adjustment (adjustment) for 'name' - requires verification",
        severity: "warn",
        constraintName: "warnLargeNegativeAdjustment",
        overrideable: false,
      },
      {
        message: "Consuming quantity unit of measure of 'name'",
        severity: "info",
        constraintName: "infoConsumed",
        overrideable: false,
      },
      {
        message: "High waste amount (percentage% of on-hand) for 'name'",
        severity: "warn",
        constraintName: "warnHighWaste",
        overrideable: false,
      },
      {
        message: "Reserving quantity unit of measure - only quantity available available",
        severity: "warn",
        constraintName: "warnStockoutRisk",
        overrideable: false,
      },
    ],
    "quantityReserved": [
      {
        message: "Releasing more (quantity) than reserved (quantity reserved) - adjusting to reserved amount",
        severity: "warn",
        constraintName: "warnReleaseExceedsReserved",
        overrideable: false,
      },
      {
        message: "Reserving quantity unit of measure - only quantity available available",
        severity: "warn",
        constraintName: "warnStockoutRisk",
        overrideable: false,
      },
    ],
  },
  "InventoryStock": {
    "quantityOnHand": [
      {
        message: "Adjustment would result in negative stock (result)",
        severity: "block",
        constraintName: "blockNegativeResult",
        overrideable: false,
      },
      {
        message: "Quantity on hand cannot be negative",
        severity: "block",
        constraintName: "nonNegativeQty",
        overrideable: false,
      },
      {
        message: "Recount shows variance of more than 20% for item 'item id'",
        severity: "warn",
        constraintName: "warnLargeVariance",
        overrideable: false,
      },
      {
        message: "Stock for item 'item id' at location 'storage location id' is zero",
        severity: "warn",
        constraintName: "warnZeroStock",
        overrideable: false,
      },
    ],
  },
  "InventorySupplier": {
    "openPOCount": [
      {
        message: "Blacklisting supplier 'name' with open pocount open purchase orders — manual PO cancellation required",
        severity: "warn",
        constraintName: "warnOpenPOs",
        overrideable: false,
      },
      {
        message: "Deactivating supplier 'name' with open pocount open purchase orders",
        severity: "warn",
        constraintName: "warnOpenPOs",
        overrideable: false,
      },
      {
        message: "Suspending supplier 'name' with open pocount open purchase orders",
        severity: "warn",
        constraintName: "warnOpenPOs",
        overrideable: false,
      },
    ],
    "paymentTerms": [
      {
        message: "Invalid payment terms",
        severity: "block",
        constraintName: "validPaymentTerms",
        overrideable: false,
      },
    ],
    "qualificationStatus": [
      {
        message: "Invalid qualification status",
        severity: "block",
        constraintName: "validQualificationStatus",
        overrideable: false,
      },
    ],
  },
  "InventoryTransaction": {
    "quantity": [
      {
        message: "Transaction quantity must not be zero",
        severity: "block",
        constraintName: "nonZeroQuantity",
        overrideable: false,
      },
    ],
    "transactionType": [
      {
        message: "Invalid transaction type",
        severity: "block",
        constraintName: "validTransactionType",
        overrideable: false,
      },
    ],
  },
  "InventoryTransfer": {
    "status": [
      {
        message: "Invalid transfer status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "InventoryTransferItem": {
    "itemId": [
      {
        message: "Inventory item ID is required",
        severity: "block",
        constraintName: "requireItem",
        overrideable: false,
      },
    ],
    "quantity": [
      {
        message: "Transfer quantity must be positive",
        severity: "block",
        constraintName: "positiveQuantity",
        overrideable: false,
      },
    ],
    "transferId": [
      {
        message: "Transfer ID is required",
        severity: "block",
        constraintName: "requireTransfer",
        overrideable: false,
      },
    ],
  },
  "Invoice": {
    "subtotal": [
      {
        message: "Amounts cannot be negative",
        severity: "block",
        constraintName: "amount_non_negative",
        overrideable: false,
      },
    ],
    "total": [
      {
        message: "Amounts cannot be negative",
        severity: "block",
        constraintName: "amount_non_negative",
        overrideable: false,
      },
    ],
  },
  "IoTAlert": {
    "message": [
      {
        message: "Alert message is required",
        severity: "block",
        constraintName: "requireMessage",
        overrideable: false,
      },
    ],
    "severity": [
      {
        message: "Invalid severity level",
        severity: "block",
        constraintName: "validSeverity",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid alert status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "IotAlertRule": {
    "condition": [
      {
        message: "Invalid condition",
        severity: "block",
        constraintName: "validCondition",
        overrideable: false,
      },
    ],
    "equipmentId": [
      {
        message: "Equipment ID is required",
        severity: "block",
        constraintName: "requireEquipment",
        overrideable: false,
      },
    ],
    "severity": [
      {
        message: "Invalid severity level",
        severity: "block",
        constraintName: "requireSeverity",
        overrideable: false,
      },
    ],
  },
  "KitchenTask": {
    "complexity": [
      {
        message: "Complexity must be between 1 (simple) and 5 (very complex)",
        severity: "block",
        constraintName: "validComplexity",
        overrideable: false,
      },
    ],
    "dueDate": [
      {
        message: "Task 'title' is overdue",
        severity: "warn",
        constraintName: "warnOverdue",
        overrideable: false,
      },
    ],
    "priority": [
      {
        message: "Priority must be between 1 (critical) and 5 (low)",
        severity: "block",
        constraintName: "validPriority",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid task status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Task 'title' is overdue",
        severity: "warn",
        constraintName: "warnOverdue",
        overrideable: false,
      },
    ],
  },
  "KitchenTaskClaim": {
    "employeeId": [
      {
        message: "Employee ID is required",
        severity: "block",
        constraintName: "requireEmployeeId",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid claim status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "taskId": [
      {
        message: "Kitchen task ID is required",
        severity: "block",
        constraintName: "requireKitchenTaskId",
        overrideable: false,
      },
    ],
  },
  "KitchenTaskProgress": {
    "employeeId": [
      {
        message: "Employee ID is required",
        severity: "block",
        constraintName: "requireEmployeeId",
        overrideable: false,
      },
    ],
    "progressPct": [
      {
        message: "Progress percentage must be between 0 and 100",
        severity: "block",
        constraintName: "validProgressPct",
        overrideable: false,
      },
    ],
    "taskId": [
      {
        message: "Kitchen task ID is required",
        severity: "block",
        constraintName: "requireKitchenTaskId",
        overrideable: false,
      },
    ],
  },
  "KnowledgeBaseEntry": {
    "category": [
      {
        message: "Invalid category",
        severity: "block",
        constraintName: "validCategory",
        overrideable: false,
      },
    ],
  },
  "LaborBudget": {
    "actualSpend": [
      {
        message: "Labor budget for location location id is over by variance amount",
        severity: "warn",
        constraintName: "warnOverBudget",
        overrideable: false,
      },
    ],
    "budgetTarget": [
      {
        message: "Cannot approve labor budget with zero amount",
        severity: "block",
        constraintName: "blockApproveZero",
        overrideable: false,
      },
      {
        message: "Budget amount must be positive",
        severity: "block",
        constraintName: "positiveBudget",
        overrideable: false,
      },
      {
        message: "Labor budget for location location id is over by variance amount",
        severity: "warn",
        constraintName: "warnOverBudget",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid labor budget status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "Lead": {
    "assignedTo": [
      {
        message: "High-value lead 'contact name' ($estimated value) is not assigned to anyone",
        severity: "warn",
        constraintName: "warnHighValueUnassigned",
        overrideable: false,
      },
    ],
    "contactName": [
      {
        message: "Contact name is required",
        severity: "block",
        constraintName: "validContactName",
        overrideable: false,
      },
    ],
    "convertedAt": [
      {
        message: "Lead 'contact name' has already been converted to client 'converted to client id'",
        severity: "block",
        constraintName: "blockAlreadyConverted",
        overrideable: false,
      },
    ],
    "convertedToClientId": [
      {
        message: "Lead 'contact name' has already been converted to client 'converted to client id'",
        severity: "block",
        constraintName: "blockAlreadyConverted",
        overrideable: false,
      },
    ],
    "estimatedValue": [
      {
        message: "Estimated value must be non-negative",
        severity: "block",
        constraintName: "positiveEstimatedValue",
        overrideable: false,
      },
      {
        message: "Disqualifying high-value lead 'contact name' ($estimated value)",
        severity: "warn",
        constraintName: "warnHighValueDisqualify",
        overrideable: false,
      },
      {
        message: "High-value lead 'contact name' ($estimated value) is not assigned to anyone",
        severity: "warn",
        constraintName: "warnHighValueUnassigned",
        overrideable: false,
      },
    ],
    "source": [
      {
        message: "Lead source must be one of: website, manual, import",
        severity: "block",
        constraintName: "validSource",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Cannot convert disqualified lead 'contact name'",
        severity: "block",
        constraintName: "blockDisqualified",
        overrideable: false,
      },
      {
        message: "Archiving open lead 'contact name' with status 'status'",
        severity: "warn",
        constraintName: "warnArchiveOpenLead",
        overrideable: false,
      },
      {
        message: "Lead 'contact name' is still in 'new' status",
        severity: "warn",
        constraintName: "warnStaleNewLead",
        overrideable: false,
      },
      {
        message: "Reverting lead 'contact name' status from 'status' back to 'new'",
        severity: "warn",
        constraintName: "warnStatusRegression",
        overrideable: false,
      },
    ],
  },
  "LogisticsDispatch": {
    "priority": [
      {
        message: "Invalid priority",
        severity: "block",
        constraintName: "validPriority",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid dispatch status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "LogisticsRoute": {
    "status": [
      {
        message: "Invalid route status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "MaintenanceWorkOrder": {
    "priority": [
      {
        message: "Invalid priority",
        severity: "block",
        constraintName: "validPriority",
        overrideable: false,
      },
    ],
    "scheduledDate": [
      {
        message: "Work order 'title' for equipment id is overdue by days day(s)",
        severity: "warn",
        constraintName: "warnOverdueWorkOrder",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Cancelling work order 'title' - ensure equipment is properly addressed",
        severity: "warn",
        constraintName: "warnCancelWorkOrder",
        overrideable: false,
      },
      {
        message: "Work order 'title' for equipment id is overdue by days day(s)",
        severity: "warn",
        constraintName: "warnOverdueWorkOrder",
        overrideable: false,
      },
    ],
    "workOrderType": [
      {
        message: "Invalid work order type",
        severity: "block",
        constraintName: "validWorkOrderType",
        overrideable: false,
      },
    ],
  },
  "Menu": {
    "basePrice": [
      {
        message: "Prices must be non-negative",
        severity: "block",
        constraintName: "positivePrices",
        overrideable: false,
      },
      {
        message: "Menu has no pricing set (base price and price per person are both 0)",
        severity: "warn",
        constraintName: "warnZeroPrice",
        overrideable: false,
      },
    ],
    "maxGuests": [
      {
        message: "Maximum guests must be >= minimum guests",
        severity: "block",
        constraintName: "validGuestRange",
        overrideable: false,
      },
      {
        message: "Maximum guest count increased by 50% or more",
        severity: "warn",
        constraintName: "warnGuestRangeIncrease",
        overrideable: false,
      },
      {
        message: "Menu has narrow guest range (min guests to max guests guests)",
        severity: "warn",
        constraintName: "warnSmallGuestRange",
        overrideable: false,
      },
    ],
    "minGuests": [
      {
        message: "Minimum guests must be non-negative",
        severity: "block",
        constraintName: "positiveMinGuests",
        overrideable: false,
      },
      {
        message: "Maximum guests must be >= minimum guests",
        severity: "block",
        constraintName: "validGuestRange",
        overrideable: false,
      },
      {
        message: "Menu has narrow guest range (min guests to max guests guests)",
        severity: "warn",
        constraintName: "warnSmallGuestRange",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Menu name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
    ],
    "pricePerPerson": [
      {
        message: "Prices must be non-negative",
        severity: "block",
        constraintName: "positivePrices",
        overrideable: false,
      },
      {
        message: "Menu price per person decreased from price per person to new price",
        severity: "warn",
        constraintName: "warnPriceDecrease",
        overrideable: false,
      },
      {
        message: "Menu has no pricing set (base price and price per person are both 0)",
        severity: "warn",
        constraintName: "warnZeroPrice",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Menu status must be draft, published, or archived",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "MenuDish": {
    "course": [
      {
        message: "Course must be a recognized value or empty",
        severity: "block",
        constraintName: "validCourse",
        overrideable: false,
      },
    ],
    "dishId": [
      {
        message: "Dish ID is required",
        severity: "block",
        constraintName: "validDishId",
        overrideable: false,
      },
    ],
    "menuId": [
      {
        message: "Menu ID is required",
        severity: "block",
        constraintName: "validMenuId",
        overrideable: false,
      },
    ],
    "priceOverride": [
      {
        message: "Clearing price override — dish will revert to its catalog price",
        severity: "warn",
        constraintName: "warnZeroOverride",
        overrideable: false,
      },
    ],
    "sortOrder": [
      {
        message: "Sort order must be non-negative",
        severity: "block",
        constraintName: "positiveSortOrder",
        overrideable: false,
      },
    ],
  },
  "MethodVideo": {
    "durationSeconds": [
      {
        message: "Duration cannot be negative",
        severity: "block",
        constraintName: "positiveDuration",
        overrideable: false,
      },
    ],
    "prepMethodId": [
      {
        message: "Prep method ID is required",
        severity: "block",
        constraintName: "requirePrepMethodId",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Video title is required",
        severity: "block",
        constraintName: "requireTitle",
        overrideable: false,
      },
    ],
    "url": [
      {
        message: "Video URL is required",
        severity: "block",
        constraintName: "requireUrl",
        overrideable: false,
      },
    ],
  },
  "Note": {
    "title": [
      {
        message: "Note title is required",
        severity: "block",
        constraintName: "requireTitle",
        overrideable: false,
      },
    ],
  },
  "Notification": {
    "isRead": [
      {
        message: "Notification 'title' is already marked as read",
        severity: "warn",
        constraintName: "warnAlreadyRead",
        overrideable: false,
      },
    ],
    "notificationType": [
      {
        message: "Notification type is required",
        severity: "block",
        constraintName: "validNotificationType",
        overrideable: false,
      },
    ],
    "recipientEmployeeId": [
      {
        message: "Recipient employee ID is required",
        severity: "block",
        constraintName: "validRecipient",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Notification title is required",
        severity: "block",
        constraintName: "validTitle",
        overrideable: false,
      },
    ],
  },
  "OnboardingTask": {
    "title": [
      {
        message: "Onboarding task title is required",
        severity: "block",
        constraintName: "requireTitle",
        overrideable: false,
      },
    ],
  },
  "OpenShift": {
    "role": [
      {
        message: "Role is required for an open shift",
        severity: "block",
        constraintName: "requireRole",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid open shift status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "OverrideAudit": {
    "authorizedBy": [
      {
        message: "Override already authorized",
        severity: "warn",
        constraintName: "cannotAuthorizeTwice",
        overrideable: false,
      },
    ],
    "constraintId": [
      {
        message: "Constraint ID is required",
        severity: "block",
        constraintName: "requireConstraintId",
        overrideable: false,
      },
    ],
    "entityId": [
      {
        message: "Entity ID is required",
        severity: "block",
        constraintName: "requireEntityId",
        overrideable: false,
      },
    ],
    "entityType": [
      {
        message: "Entity type is required",
        severity: "block",
        constraintName: "requireEntityType",
        overrideable: false,
      },
    ],
    "overriddenBy": [
      {
        message: "Overridden by user is required",
        severity: "block",
        constraintName: "requireOverriddenBy",
        overrideable: false,
      },
    ],
    "overrideReason": [
      {
        message: "Override reason is required",
        severity: "block",
        constraintName: "requireOverrideReason",
        overrideable: false,
      },
    ],
  },
  "Payment": {
    "amount": [
      {
        message: "Payment amount must be positive",
        severity: "block",
        constraintName: "amount_positive",
        overrideable: false,
      },
    ],
    "currency": [
      {
        message: "Currency must be supported",
        severity: "block",
        constraintName: "valid_currency",
        overrideable: false,
      },
    ],
  },
  "PaymentMethod": {
    "isDefault": [
      {
        message: "Only active payment methods can be default",
        severity: "block",
        constraintName: "default_for_active_only",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Only active payment methods can be default",
        severity: "block",
        constraintName: "default_for_active_only",
        overrideable: false,
      },
    ],
  },
  "PaymentRefundAttempt": {
    "requestedAmount": [
      {
        message: "Refund amount must be positive",
        severity: "block",
        constraintName: "requestedAmountPositive",
        overrideable: false,
      },
    ],
  },
  "PayrollLineItem": {
    "grossPay": [
      {
        message: "Gross pay cannot be negative",
        severity: "block",
        constraintName: "grossPayPositive",
        overrideable: false,
      },
    ],
    "hoursWorked": [
      {
        message: "Hours worked cannot be negative",
        severity: "block",
        constraintName: "hoursWorkedPositive",
        overrideable: false,
      },
    ],
    "netPay": [
      {
        message: "Net pay cannot be negative",
        severity: "block",
        constraintName: "netPayPositive",
        overrideable: false,
      },
    ],
  },
  "PayrollPeriod": {
    "status": [
      {
        message: "Invalid payroll period status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "PayrollRun": {
    "status": [
      {
        message: "Invalid payroll run status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "PerformancePrediction": {
    "confidence": [
      {
        message: "Invalid confidence level",
        severity: "block",
        constraintName: "validConfidence",
        overrideable: false,
      },
    ],
    "predictionScore": [
      {
        message: "Prediction score must be 0-100",
        severity: "block",
        constraintName: "validScore",
        overrideable: false,
      },
    ],
    "predictionType": [
      {
        message: "Invalid prediction type",
        severity: "block",
        constraintName: "validPredictionType",
        overrideable: false,
      },
    ],
  },
  "PerformanceReview": {
    "rating": [
      {
        message: "Rating must be between 0 and 5",
        severity: "block",
        constraintName: "validRating",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid performance review status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "PrepComment": {
    "isResolved": [
      {
        message: "Cannot delete resolved comment 'id' — unresolve it first",
        severity: "block",
        constraintName: "blockDeleteIfResolved",
        overrideable: false,
      },
      {
        message: "Comment 'id' is already resolved by 'resolved by'",
        severity: "warn",
        constraintName: "warnAlreadyResolved",
        overrideable: false,
      },
    ],
  },
  "PrepList": {
    "batchMultiplier": [
      {
        message: "Batch multiplier must be positive",
        severity: "block",
        constraintName: "validBatchMultiplier",
        overrideable: false,
      },
      {
        message: "Large batch multiplier (multiplierx) - verify quantities",
        severity: "warn",
        constraintName: "warnLargeBatchMultiplier",
        overrideable: false,
      },
      {
        message: "Batch multiplier doubled or more (from batch multiplierx to new multiplierx)",
        severity: "warn",
        constraintName: "warnLargeMultiplierIncrease",
        overrideable: false,
      },
    ],
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "validEventId",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Prep list name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
      {
        message: "Renaming prep list from 'name' to 'new name'",
        severity: "warn",
        constraintName: "warnNameChange",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "totalEstimatedTime": [
      {
        message: "Total estimated time must be non-negative",
        severity: "block",
        constraintName: "positiveTotalTime",
        overrideable: false,
      },
      {
        message: "Total prep time exceeds hours hours",
        severity: "warn",
        constraintName: "warnLongTotalTime",
        overrideable: false,
      },
    ],
    "totalItems": [
      {
        message: "Total items must be non-negative",
        severity: "block",
        constraintName: "positiveTotalItems",
        overrideable: false,
      },
      {
        message: "Prep list has many items (count) - consider splitting by station",
        severity: "warn",
        constraintName: "warnManyItems",
        overrideable: false,
      },
      {
        message: "Prep list has no items",
        severity: "warn",
        constraintName: "warnZeroItems",
        overrideable: false,
      },
    ],
  },
  "PrepListImport": {
    "fileName": [
      {
        message: "File name is required",
        severity: "block",
        constraintName: "requireFileName",
        overrideable: false,
      },
    ],
    "source": [
      {
        message: "Import source is required",
        severity: "block",
        constraintName: "requireSource",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid import status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "PrepListItem": {
    "allergens": [
      {
        message: "Item contains major allergen: allergens",
        severity: "warn",
        constraintName: "warnMajorAllergen",
        overrideable: false,
      },
    ],
    "dishName": [
      {
        message: "Optional item for required dish: dish name",
        severity: "warn",
        constraintName: "warnOptionalRequired",
        overrideable: false,
      },
    ],
    "ingredientId": [
      {
        message: "Ingredient ID is required",
        severity: "block",
        constraintName: "validIngredientId",
        overrideable: false,
      },
    ],
    "ingredientName": [
      {
        message: "Ingredient name is required",
        severity: "block",
        constraintName: "validIngredientName",
        overrideable: false,
      },
    ],
    "isOptional": [
      {
        message: "Optional item for required dish: dish name",
        severity: "warn",
        constraintName: "warnOptionalRequired",
        overrideable: false,
      },
    ],
    "prepListId": [
      {
        message: "Prep list ID is required",
        severity: "block",
        constraintName: "validPrepListId",
        overrideable: false,
      },
    ],
    "scaledQuantity": [
      {
        message: "Scaled quantity must be non-negative",
        severity: "block",
        constraintName: "positiveScaledQuantity",
        overrideable: false,
      },
      {
        message: "Quantity increased by 50% or more",
        severity: "warn",
        constraintName: "warnQuantityIncrease",
        overrideable: false,
      },
    ],
    "sortOrder": [
      {
        message: "Sort order must be non-negative",
        severity: "block",
        constraintName: "positiveSortOrder",
        overrideable: false,
      },
    ],
    "stationId": [
      {
        message: "Reassigning from 'old station' to 'new station'",
        severity: "warn",
        constraintName: "warnStationChange",
        overrideable: false,
      },
    ],
    "stationName": [
      {
        message: "Station name is required",
        severity: "block",
        constraintName: "validStationName",
        overrideable: false,
      },
    ],
  },
  "PrepMethod": {
    "estimatedDurationMinutes": [
      {
        message: "Estimated duration cannot be negative",
        severity: "block",
        constraintName: "positiveDuration",
        overrideable: false,
      },
      {
        message: "Prep method 'name' has no estimated duration configured",
        severity: "warn",
        constraintName: "warnNoDuration",
        overrideable: false,
      },
    ],
    "isActive": [
      {
        message: "Prep method 'name' has no estimated duration configured",
        severity: "warn",
        constraintName: "warnNoDuration",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Prep method name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "PrepTask": {
    "claimedBy": [
      {
        message: "Reassigning in-progress task from 'claimed by' to 'new assignee'",
        severity: "warn",
        constraintName: "warnReassignInProgress",
        overrideable: false,
      },
      {
        message: "Station 'station id' has active task - verify capacity",
        severity: "warn",
        constraintName: "warnStationCapacity",
        overrideable: false,
      },
    ],
    "dueByDate": [
      {
        message: "Task 'name' is overdue by days overdue day(s)",
        severity: "warn",
        constraintName: "warnOverdue",
        overrideable: false,
      },
      {
        message: "Claiming overdue task 'name'",
        severity: "warn",
        constraintName: "warnOverdueClaim",
        overrideable: false,
      },
    ],
    "priority": [
      {
        message: "Priority must be between 1 (critical) and 5 (low)",
        severity: "block",
        constraintName: "validPriority",
        overrideable: false,
      },
    ],
    "quantityTotal": [
      {
        message: "Total quantity must be non-negative",
        severity: "block",
        constraintName: "positiveQuantity",
        overrideable: false,
      },
      {
        message: "Completing with remaining quantity unit id remaining",
        severity: "warn",
        constraintName: "warnIncomplete",
        overrideable: false,
      },
      {
        message: "Decreasing total quantity from quantity total to new total",
        severity: "warn",
        constraintName: "warnQuantityDecrease",
        overrideable: false,
      },
    ],
    "stationId": [
      {
        message: "Station 'station id' has active task - verify capacity",
        severity: "warn",
        constraintName: "warnStationCapacity",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid task status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Canceling in-progress task claimed by 'claimed by'",
        severity: "warn",
        constraintName: "warnCancelInProgress",
        overrideable: false,
      },
      {
        message: "Task 'name' is overdue by days overdue day(s)",
        severity: "warn",
        constraintName: "warnOverdue",
        overrideable: false,
      },
      {
        message: "Claiming overdue task 'name'",
        severity: "warn",
        constraintName: "warnOverdueClaim",
        overrideable: false,
      },
      {
        message: "Reassigning in-progress task from 'claimed by' to 'new assignee'",
        severity: "warn",
        constraintName: "warnReassignInProgress",
        overrideable: false,
      },
    ],
  },
  "PrepTaskPlanWorkflow": {
    "approvedCount": [
      {
        message: "Only instantiated of approved count tasks were successfully instantiated",
        severity: "warn",
        constraintName: "warnPartialInstantiation",
        overrideable: false,
      },
    ],
    "eventId": [
      {
        message: "Event ID is required for task generation",
        severity: "block",
        constraintName: "hasEventId",
        overrideable: false,
      },
    ],
    "generatedCount": [
      {
        message: "All generated count tasks were rejected during review",
        severity: "warn",
        constraintName: "warnAllRejected",
        overrideable: false,
      },
    ],
    "idempotencyKey": [
      {
        message: "Idempotency key is required for workflow tracking",
        severity: "block",
        constraintName: "hasIdempotencyKey",
        overrideable: false,
      },
    ],
  },
  "PreventiveMaintenanceSchedule": {
    "frequency": [
      {
        message: "Frequency is required",
        severity: "block",
        constraintName: "requireFrequency",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Schedule title is required",
        severity: "block",
        constraintName: "requireTitle",
        overrideable: false,
      },
    ],
  },
  "PricingTier": {
    "discountPercent": [
      {
        message: "Discount percent must be between 0 and 100",
        severity: "block",
        constraintName: "validDiscount",
        overrideable: false,
      },
    ],
    "isActive": [
      {
        message: "Deleting active pricing tier 'tier name'",
        severity: "warn",
        constraintName: "warnActiveTier",
        overrideable: false,
      },
      {
        message: "Pricing tier 'tier name' has zero unit cost — verify this is intentional",
        severity: "warn",
        constraintName: "warnZeroCost",
        overrideable: false,
      },
    ],
    "maxQuantity": [
      {
        message: "Max quantity must be >= min quantity when set",
        severity: "block",
        constraintName: "validQuantityRange",
        overrideable: false,
      },
    ],
    "minQuantity": [
      {
        message: "Minimum quantity must be at least 1",
        severity: "block",
        constraintName: "requireMinQuantity",
        overrideable: false,
      },
      {
        message: "Max quantity must be >= min quantity when set",
        severity: "block",
        constraintName: "validQuantityRange",
        overrideable: false,
      },
    ],
    "tierName": [
      {
        message: "Tier name is required",
        severity: "block",
        constraintName: "requireTierName",
        overrideable: false,
      },
    ],
    "unitCost": [
      {
        message: "Unit cost must be non-negative",
        severity: "block",
        constraintName: "requireUnitCost",
        overrideable: false,
      },
      {
        message: "Unit cost reduced from unit cost to new cost for tier 'tier name'",
        severity: "warn",
        constraintName: "warnPriceReduction",
        overrideable: false,
      },
      {
        message: "Pricing tier 'tier name' has zero unit cost — verify this is intentional",
        severity: "warn",
        constraintName: "warnZeroCost",
        overrideable: false,
      },
    ],
  },
  "ProcurementBudget": {
    "budgetAmount": [
      {
        message: "Budget amount must be positive",
        severity: "block",
        constraintName: "positiveBudget",
        overrideable: false,
      },
      {
        message: "Procurement budget 'name' is over budget (spent spent amount, limit budget amount)",
        severity: "warn",
        constraintName: "warnOverBudget",
        overrideable: false,
      },
    ],
    "spentAmount": [
      {
        message: "Cannot reduce budget below already-spent amount (spent amount)",
        severity: "block",
        constraintName: "blockReduceBelowSpent",
        overrideable: false,
      },
      {
        message: "Spent amount cannot be negative",
        severity: "block",
        constraintName: "nonNegativeSpent",
        overrideable: false,
      },
      {
        message: "Procurement budget 'name' is over budget (spent spent amount, limit budget amount)",
        severity: "warn",
        constraintName: "warnOverBudget",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid budget status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "ProcurementBudgetAlert": {
    "utilizationPct": [
      {
        message: "Utilization percentage must be positive",
        severity: "block",
        constraintName: "validThreshold",
        overrideable: false,
      },
    ],
  },
  "Proposal": {
    "clientId": [
      {
        message: "Creating proposal with no client or lead attached",
        severity: "warn",
        constraintName: "warnNoClient",
        overrideable: false,
      },
    ],
    "discountAmount": [
      {
        message: "Proposal 'proposal number' has a discount exceeding 20% of subtotal",
        severity: "warn",
        constraintName: "warnHighDiscount",
        overrideable: true,
      },
    ],
    "lineItemCount": [
      {
        message: "Cannot send proposal 'proposal number' with no line items",
        severity: "block",
        constraintName: "blockNoLineItems",
        overrideable: false,
      },
    ],
    "proposalNumber": [
      {
        message: "Proposal number is required",
        severity: "block",
        constraintName: "validProposalNumber",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Cannot withdraw accepted proposal 'proposal number'",
        severity: "block",
        constraintName: "blockAlreadyAccepted",
        overrideable: false,
      },
      {
        message: "Proposal 'proposal number' is already withdrawn",
        severity: "block",
        constraintName: "blockAlreadyWithdrawn",
        overrideable: false,
      },
      {
        message: "Invalid proposal status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Proposal 'proposal number' is sent and approaching expiration",
        severity: "warn",
        constraintName: "warnExpiringSoon",
        overrideable: false,
      },
    ],
    "subtotal": [
      {
        message: "Subtotal must be non-negative",
        severity: "block",
        constraintName: "positiveSubtotal",
        overrideable: false,
      },
      {
        message: "Proposal 'proposal number' has a discount exceeding 20% of subtotal",
        severity: "warn",
        constraintName: "warnHighDiscount",
        overrideable: true,
      },
    ],
    "taxRate": [
      {
        message: "Tax rate must be non-negative",
        severity: "block",
        constraintName: "positiveTaxRate",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Proposal title is required",
        severity: "block",
        constraintName: "validTitle",
        overrideable: false,
      },
    ],
    "total": [
      {
        message: "Total must be non-negative",
        severity: "block",
        constraintName: "positiveTotal",
        overrideable: false,
      },
      {
        message: "Sending proposal 'proposal number' with zero total amount",
        severity: "warn",
        constraintName: "warnZeroTotal",
        overrideable: false,
      },
    ],
    "validUntil": [
      {
        message: "Cannot accept expired proposal 'proposal number' (expired on valid until)",
        severity: "block",
        constraintName: "blockExpired",
        overrideable: false,
      },
      {
        message: "Proposal 'proposal number' is sent and approaching expiration",
        severity: "warn",
        constraintName: "warnExpiringSoon",
        overrideable: false,
      },
      {
        message: "Sending proposal 'proposal number' with no expiration date",
        severity: "warn",
        constraintName: "warnNoValidUntil",
        overrideable: false,
      },
    ],
  },
  "ProposalDraft": {
    "clientEmail": [
      {
        message: "Proposal 'title' sent without valid client email",
        severity: "warn",
        constraintName: "warnNoClientEmail",
        overrideable: false,
      },
      {
        message: "Sending proposal via email without valid client email address",
        severity: "warn",
        constraintName: "warnNoClientEmailOnSend",
        overrideable: false,
      },
    ],
    "clientName": [
      {
        message: "Client name is required",
        severity: "block",
        constraintName: "validClientName",
        overrideable: false,
      },
    ],
    "depositAmount": [
      {
        message: "Deposit amount must be non-negative",
        severity: "block",
        constraintName: "positiveDepositAmount",
        overrideable: false,
      },
    ],
    "magicTokenExpiresAt": [
      {
        message: "Proposal 'title' magic link has expired",
        severity: "warn",
        constraintName: "warnTokenExpired",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Proposal 'title' sent without valid client email",
        severity: "warn",
        constraintName: "warnNoClientEmail",
        overrideable: false,
      },
      {
        message: "Proposal 'title' magic link has expired",
        severity: "warn",
        constraintName: "warnTokenExpired",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Proposal title is required",
        severity: "block",
        constraintName: "validTitle",
        overrideable: false,
      },
    ],
    "version": [
      {
        message: "Version must be positive",
        severity: "block",
        constraintName: "positiveVersion",
        overrideable: false,
      },
    ],
  },
  "ProposalLineItem": {
    "description": [
      {
        message: "Description is required",
        severity: "block",
        constraintName: "validDescription",
        overrideable: false,
      },
    ],
    "proposalId": [
      {
        message: "Proposal ID is required",
        severity: "block",
        constraintName: "validProposalId",
        overrideable: false,
      },
    ],
    "quantity": [
      {
        message: "Quantity must be positive",
        severity: "block",
        constraintName: "positiveQuantity",
        overrideable: false,
      },
    ],
    "sortOrder": [
      {
        message: "Sort order must be non-negative",
        severity: "block",
        constraintName: "positiveSortOrder",
        overrideable: false,
      },
    ],
    "unitPrice": [
      {
        message: "Unit price must be non-negative",
        severity: "block",
        constraintName: "positiveUnitPrice",
        overrideable: false,
      },
      {
        message: "Line item 'description' has zero unit price",
        severity: "warn",
        constraintName: "warnZeroPrice",
        overrideable: false,
      },
    ],
  },
  "ProposalTemplate": {
    "isActive": [
      {
        message: "Proposal template 'name' is inactive and will not appear for new proposals",
        severity: "warn",
        constraintName: "warnInactiveTemplate",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Template name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "PurchaseOrder": {
    "itemCount": [
      {
        message: "Cannot approve purchase order 'po number' with no items",
        severity: "block",
        constraintName: "blockNoItems",
        overrideable: false,
      },
      {
        message: "Cannot submit purchase order 'po number' with no items",
        severity: "block",
        constraintName: "blockNoItems",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Cannot cancel purchase order 'po number' - already received",
        severity: "block",
        constraintName: "blockCancelReceived",
        overrideable: false,
      },
      {
        message: "Invalid purchase order status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Cancelling ordered purchase order 'po number' - vendor may need notification",
        severity: "warn",
        constraintName: "warnCancelOrdered",
        overrideable: false,
      },
    ],
  },
  "PurchaseOrderItem": {
    "quantityOrdered": [
      {
        message: "Quantity ordered must be positive",
        severity: "block",
        constraintName: "positiveQuantity",
        overrideable: false,
      },
    ],
    "unitCost": [
      {
        message: "Unit cost cannot be negative",
        severity: "block",
        constraintName: "positiveUnitCost",
        overrideable: false,
      },
    ],
  },
  "PurchaseRequisition": {
    "itemCount": [
      {
        message: "Cannot submit requisition 'requisition number' with no items",
        severity: "block",
        constraintName: "blockNoItems",
        overrideable: false,
      },
    ],
    "priority": [
      {
        message: "Invalid priority level",
        severity: "block",
        constraintName: "validPriority",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid requisition status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Requisition 'requisition number' is no longer in draft — most edits are blocked",
        severity: "warn",
        constraintName: "warnNotDraft",
        overrideable: false,
      },
    ],
  },
  "PurchaseRequisitionItem": {
    "estimatedUnitCost": [
      {
        message: "Unit cost cannot be negative",
        severity: "block",
        constraintName: "nonNegativeCost",
        overrideable: false,
      },
    ],
    "quantityRequested": [
      {
        message: "Quantity requested must be positive",
        severity: "block",
        constraintName: "positiveQuantity",
        overrideable: false,
      },
    ],
  },
  "QACheck": {
    "checkType": [
      {
        message: "Invalid check type",
        severity: "block",
        constraintName: "validCheckType",
        overrideable: false,
      },
    ],
    "result": [
      {
        message: "Invalid check result",
        severity: "block",
        constraintName: "validResult",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid check status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "QACorrectiveAction": {
    "severity": [
      {
        message: "Invalid severity",
        severity: "block",
        constraintName: "validPriority",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid action status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "QATemperatureLog": {
    "temperature": [
      {
        message: "Temperature temperatureunit at log type is outside safe range",
        severity: "warn",
        constraintName: "warnUnsafeTemperature",
        overrideable: false,
      },
    ],
    "unit": [
      {
        message: "Temperature temperatureunit at log type is outside safe range",
        severity: "warn",
        constraintName: "warnUnsafeTemperature",
        overrideable: false,
      },
    ],
  },
  "QualityCheck": {
    "checkType": [
      {
        message: "Check type is required",
        severity: "block",
        constraintName: "requireCheckType",
        overrideable: false,
      },
    ],
    "completedBy": [
      {
        message: "Performer employee ID is required",
        severity: "block",
        constraintName: "requirePerformedBy",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid quality check status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "QualityCheckItem": {
    "checkId": [
      {
        message: "Quality check ID is required",
        severity: "block",
        constraintName: "requireQualityCheckId",
        overrideable: false,
      },
    ],
    "criterion": [
      {
        message: "Criterion description is required",
        severity: "block",
        constraintName: "requireCriterion",
        overrideable: false,
      },
    ],
    "sortOrder": [
      {
        message: "Sort order cannot be negative",
        severity: "block",
        constraintName: "positiveSortOrder",
        overrideable: false,
      },
    ],
  },
  "RateLimitConfig": {
    "endpointPattern": [
      {
        message: "Endpoint pattern is required",
        severity: "block",
        constraintName: "requireEndpointPattern",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Rate limit name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "Recipe": {
    "name": [
      {
        message: "Recipe name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
      {
        message: "Renaming recipe from 'name' to 'new name'",
        severity: "warn",
        constraintName: "warnNameChange",
        overrideable: false,
      },
    ],
  },
  "RecipeIngredient": {
    "quantity": [
      {
        message: "Ingredient quantity must be positive",
        severity: "block",
        constraintName: "positiveQuantity",
        overrideable: false,
      },
      {
        message: "Ingredient quantity increased by 50% or more",
        severity: "warn",
        constraintName: "warnQuantityIncrease",
        overrideable: false,
      },
    ],
    "sortOrder": [
      {
        message: "Sort order must be positive",
        severity: "block",
        constraintName: "validOrder",
        overrideable: false,
      },
    ],
    "wasteFactor": [
      {
        message: "Waste factor must be greater than 0",
        severity: "block",
        constraintName: "validWasteFactor",
        overrideable: false,
      },
    ],
  },
  "RecipeStep": {
    "instruction": [
      {
        message: "Instruction is required",
        severity: "block",
        constraintName: "validInstruction",
        overrideable: false,
      },
    ],
    "stepNumber": [
      {
        message: "Step number must be positive",
        severity: "block",
        constraintName: "positiveStepNumber",
        overrideable: false,
      },
    ],
  },
  "RecipeVersion": {
    "cookTimeMinutes": [
      {
        message: "Time values must be non-negative",
        severity: "block",
        constraintName: "validTimes",
        overrideable: false,
      },
      {
        message: "Recipe takes 8+ hours to complete",
        severity: "warn",
        constraintName: "warnLongRecipe",
        overrideable: false,
      },
    ],
    "difficultyLevel": [
      {
        message: "High difficulty recipe (level difficulty) - requires skilled staff",
        severity: "warn",
        constraintName: "warnHighDifficulty",
        overrideable: false,
      },
    ],
    "prepTimeMinutes": [
      {
        message: "Time values must be non-negative",
        severity: "block",
        constraintName: "validTimes",
        overrideable: false,
      },
      {
        message: "Recipe takes 8+ hours to complete",
        severity: "warn",
        constraintName: "warnLongRecipe",
        overrideable: false,
      },
    ],
    "restTimeMinutes": [
      {
        message: "Time values must be non-negative",
        severity: "block",
        constraintName: "validTimes",
        overrideable: false,
      },
      {
        message: "Recipe takes 8+ hours to complete",
        severity: "warn",
        constraintName: "warnLongRecipe",
        overrideable: false,
      },
    ],
    "totalCost": [
      {
        message: "Total cost cannot be negative",
        severity: "block",
        constraintName: "nonNegativeCost",
        overrideable: false,
      },
    ],
    "versionNumber": [
      {
        message: "Version number must be positive",
        severity: "block",
        constraintName: "validVersionNumber",
        overrideable: false,
      },
    ],
    "yieldQuantity": [
      {
        message: "Yield quantity must be positive",
        severity: "block",
        constraintName: "positiveYield",
        overrideable: false,
      },
    ],
  },
  "ReorderSuggestion": {
    "status": [
      {
        message: "Invalid reorder suggestion status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "suggestedQuantity": [
      {
        message: "Suggested quantity must be positive",
        severity: "block",
        constraintName: "positiveSuggestedQty",
        overrideable: false,
      },
    ],
  },
  "Report": {
    "name": [
      {
        message: "Report name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "reportType": [
      {
        message: "Report type is required",
        severity: "block",
        constraintName: "requireReportType",
        overrideable: false,
      },
    ],
  },
  "RevenueRecognitionLine": {
    "amount": [
      {
        message: "Line amount must be positive",
        severity: "block",
        constraintName: "amount_positive",
        overrideable: false,
      },
      {
        message: "Recognized amount cannot exceed line amount",
        severity: "block",
        constraintName: "recognized_not_exceed",
        overrideable: false,
      },
    ],
    "recognizedAmount": [
      {
        message: "Recognized amount cannot exceed line amount",
        severity: "block",
        constraintName: "recognized_not_exceed",
        overrideable: false,
      },
    ],
    "sequence": [
      {
        message: "Sequence must be non-negative",
        severity: "block",
        constraintName: "sequence_positive",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "RevenueRecognitionSchedule": {
    "endDate": [
      {
        message: "End date must be after start date",
        severity: "block",
        constraintName: "dates_valid",
        overrideable: false,
      },
    ],
    "method": [
      {
        message: "Method must be valid",
        severity: "block",
        constraintName: "validMethod",
        overrideable: false,
      },
    ],
    "recognizedAmount": [
      {
        message: "Total must equal recognized plus remaining",
        severity: "block",
        constraintName: "amount_consistent",
        overrideable: false,
      },
    ],
    "remainingAmount": [
      {
        message: "Total must equal recognized plus remaining",
        severity: "block",
        constraintName: "amount_consistent",
        overrideable: false,
      },
    ],
    "startDate": [
      {
        message: "End date must be after start date",
        severity: "block",
        constraintName: "dates_valid",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be valid",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "totalAmount": [
      {
        message: "Total must equal recognized plus remaining",
        severity: "block",
        constraintName: "amount_consistent",
        overrideable: false,
      },
      {
        message: "Total amount must be positive",
        severity: "block",
        constraintName: "amount_positive",
        overrideable: false,
      },
    ],
  },
  "RolePolicy": {
    "roleId": [
      {
        message: "Role ID is required",
        severity: "block",
        constraintName: "requireRole",
        overrideable: false,
      },
    ],
  },
  "RouteStop": {
    "name": [
      {
        message: "Stop name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid route stop status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "stopNumber": [
      {
        message: "Stop number must be non-negative",
        severity: "block",
        constraintName: "stopNumberPositive",
        overrideable: false,
      },
    ],
  },
  "Schedule": {
    "shiftCount": [
      {
        message: "Cannot publish schedule with no shifts assigned",
        severity: "block",
        constraintName: "blockNoShifts",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid schedule status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "ScheduleShift": {
    "shiftEnd": [
      {
        message: "Shift end must be after shift start",
        severity: "block",
        constraintName: "validShiftTimes",
        overrideable: false,
      },
      {
        message: "Shift duration (duration hours hours) exceeds 12 hours",
        severity: "warn",
        constraintName: "warnLongShift",
        overrideable: false,
      },
    ],
    "shiftStart": [
      {
        message: "Shift end must be after shift start",
        severity: "block",
        constraintName: "validShiftTimes",
        overrideable: false,
      },
      {
        message: "Shift duration (duration hours hours) exceeds 12 hours",
        severity: "warn",
        constraintName: "warnLongShift",
        overrideable: false,
      },
    ],
    "swapStatus": [
      {
        message: "Invalid swap status",
        severity: "block",
        constraintName: "validSwapStatus",
        overrideable: false,
      },
    ],
  },
  "Shipment": {
    "status": [
      {
        message: "Invalid shipment status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Cancelling in-transit shipment 'shipment number' - carrier may need notification",
        severity: "warn",
        constraintName: "warnCancelInTransit",
        overrideable: true,
      },
    ],
    "totalItems": [
      {
        message: "Cannot mark shipment 'shipment number' as delivered with no items received",
        severity: "block",
        constraintName: "blockNoItems",
        overrideable: false,
      },
      {
        message: "Cannot schedule shipment with no items",
        severity: "block",
        constraintName: "blockNoItems",
        overrideable: false,
      },
    ],
  },
  "ShipmentItem": {
    "quantityShipped": [
      {
        message: "Quantity shipped cannot be negative",
        severity: "block",
        constraintName: "positiveQuantityShipped",
        overrideable: false,
      },
      {
        message: "Received quantity (received) exceeds shipped quantity (quantity shipped)",
        severity: "warn",
        constraintName: "warnOverReceived",
        overrideable: false,
      },
    ],
  },
  "SmsAutomationRule": {
    "customMessage": [
      {
        message: "Either template or custom message is required",
        severity: "block",
        constraintName: "hasMessageOrTemplate",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Rule name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "templateId": [
      {
        message: "Either template or custom message is required",
        severity: "block",
        constraintName: "hasMessageOrTemplate",
        overrideable: false,
      },
    ],
    "triggerType": [
      {
        message: "Trigger type is required",
        severity: "block",
        constraintName: "validTriggerType",
        overrideable: false,
      },
    ],
  },
  "StaffMember": {
    "displayName": [
      {
        message: "Display name is required",
        severity: "block",
        constraintName: "requireDisplayName",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be active or inactive",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "StaffPerformance": {
    "rating": [
      {
        message: "Rating must be between 0 and 5",
        severity: "block",
        constraintName: "validRating",
        overrideable: false,
      },
    ],
    "reviewType": [
      {
        message: "Invalid review type",
        severity: "block",
        constraintName: "validReviewType",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid review status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "StaffTrainingSignal": {
    "signalType": [
      {
        message: "Invalid staff training signal type",
        severity: "block",
        constraintName: "validSignalType",
        overrideable: false,
      },
    ],
  },
  "Station": {
    "capacitySimultaneousTasks": [
      {
        message: "Cannot assign task — station 'name' is at full capacity (current task count/capacity simultaneous tasks)",
        severity: "block",
        constraintName: "blockFull",
        overrideable: false,
      },
      {
        message: "Station capacity must be positive",
        severity: "block",
        constraintName: "positiveCapacity",
        overrideable: false,
      },
      {
        message: "Reducing capacity from capacity simultaneous tasks to new max with current task count active tasks",
        severity: "warn",
        constraintName: "warnCapacityReduction",
        overrideable: false,
      },
      {
        message: "Station 'name' is near capacity (current task count/capacity simultaneous tasks tasks)",
        severity: "warn",
        constraintName: "warnNearCapacity",
        overrideable: false,
      },
      {
        message: "Assigning task 'task name' to near-capacity station 'name'",
        severity: "warn",
        constraintName: "warnNearCapacity",
        overrideable: false,
      },
    ],
    "currentTaskCount": [
      {
        message: "Cannot assign task — station 'name' is at full capacity (current task count/capacity simultaneous tasks)",
        severity: "block",
        constraintName: "blockFull",
        overrideable: false,
      },
      {
        message: "Starting maintenance on station 'name' with current active tasks",
        severity: "warn",
        constraintName: "warnActiveTasks",
        overrideable: false,
      },
      {
        message: "Reducing capacity from capacity simultaneous tasks to new max with current task count active tasks",
        severity: "warn",
        constraintName: "warnCapacityReduction",
        overrideable: false,
      },
      {
        message: "Deactivating station 'name' with current active tasks",
        severity: "warn",
        constraintName: "warnDeactivateWithTasks",
        overrideable: false,
      },
      {
        message: "Station 'name' is near capacity (current task count/capacity simultaneous tasks tasks)",
        severity: "warn",
        constraintName: "warnNearCapacity",
        overrideable: false,
      },
      {
        message: "Assigning task 'task name' to near-capacity station 'name'",
        severity: "warn",
        constraintName: "warnNearCapacity",
        overrideable: false,
      },
      {
        message: "Removing task from empty station 'name'",
        severity: "warn",
        constraintName: "warnNoTasks",
        overrideable: false,
      },
    ],
    "stationType": [
      {
        message: "Invalid station type",
        severity: "block",
        constraintName: "validStationType",
        overrideable: false,
      },
    ],
  },
  "StorageLocation": {
    "name": [
      {
        message: "Storage location name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "storageType": [
      {
        message: "Storage type is required",
        severity: "block",
        constraintName: "requireStorageType",
        overrideable: false,
      },
      {
        message: "Invalid storage type",
        severity: "block",
        constraintName: "validStorageType",
        overrideable: false,
      },
    ],
  },
  "TaskBundle": {
    "name": [
      {
        message: "Task bundle name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid bundle status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "TaskBundleItem": {
    "kitchenTaskId": [
      {
        message: "Kitchen task ID is required",
        severity: "block",
        constraintName: "requireKitchenTaskId",
        overrideable: false,
      },
    ],
    "sortOrder": [
      {
        message: "Sort order cannot be negative",
        severity: "block",
        constraintName: "positiveSortOrder",
        overrideable: false,
      },
    ],
    "taskBundleId": [
      {
        message: "Task bundle ID is required",
        severity: "block",
        constraintName: "requireTaskBundleId",
        overrideable: false,
      },
    ],
  },
  "TemperatureLog": {
    "equipmentId": [
      {
        message: "Equipment ID is required",
        severity: "block",
        constraintName: "requireEquipment",
        overrideable: false,
      },
    ],
    "loggedBy": [
      {
        message: "Recorder employee ID is required",
        severity: "block",
        constraintName: "requireRecordedBy",
        overrideable: false,
      },
    ],
    "withinRange": [
      {
        message: "Manual temperature log for equipment 'equipment id' is out of safe range",
        severity: "warn",
        constraintName: "warnOutOfRange",
        overrideable: false,
      },
    ],
  },
  "TemperatureProbe": {
    "maxTemp": [
      {
        message: "minTemp must be less than maxTemp",
        severity: "block",
        constraintName: "thresholdOrder",
        overrideable: false,
      },
    ],
    "minTemp": [
      {
        message: "minTemp must be less than maxTemp",
        severity: "block",
        constraintName: "thresholdOrder",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Probe name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "TemperatureReading": {
    "probeId": [
      {
        message: "Probe ID is required",
        severity: "block",
        constraintName: "requireProbe",
        overrideable: false,
      },
    ],
    "withinRange": [
      {
        message: "Automated reading from probe 'probe id' is out of safe range",
        severity: "warn",
        constraintName: "warnOutOfRange",
        overrideable: false,
      },
    ],
  },
  "TimecardApproval": {
    "status": [
      {
        message: "Invalid timecard approval status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "TimecardEditRequest": {
    "status": [
      {
        message: "Edit request has already been processed (status: 'status')",
        severity: "block",
        constraintName: "blockAlreadyProcessed",
        overrideable: false,
      },
      {
        message: "Invalid edit request status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "TimeEntry": {
    "clockIn": [
      {
        message: "Employee 'employee id' is already clocked in",
        severity: "block",
        constraintName: "blockAlreadyClockedIn",
        overrideable: false,
      },
      {
        message: "Cannot clock out - no active clock-in found",
        severity: "block",
        constraintName: "blockNotClockedIn",
        overrideable: false,
      },
      {
        message: "Clock-out after 12+ hours for employee 'employee id'",
        severity: "warn",
        constraintName: "warnLongShift",
        overrideable: false,
      },
    ],
    "clockOut": [
      {
        message: "Employee 'employee id' is already clocked in",
        severity: "block",
        constraintName: "blockAlreadyClockedIn",
        overrideable: false,
      },
    ],
  },
  "TimelineTask": {
    "eventId": [
      {
        message: "Event ID is required",
        severity: "block",
        constraintName: "requireEvent",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Status must be pending, in_progress, done, or blocked",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Task title is required",
        severity: "block",
        constraintName: "requireTitle",
        overrideable: false,
      },
    ],
  },
  "TimeOffRequest": {
    "employeeId": [
      {
        message: "Employee ID is required",
        severity: "block",
        constraintName: "requireEmployee",
        overrideable: false,
      },
    ],
    "endDate": [
      {
        message: "End date is required",
        severity: "block",
        constraintName: "requireEndDate",
        overrideable: false,
      },
    ],
    "requestType": [
      {
        message: "Request type is required",
        severity: "block",
        constraintName: "requireRequestType",
        overrideable: false,
      },
    ],
    "startDate": [
      {
        message: "Start date is required",
        severity: "block",
        constraintName: "requireStartDate",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid request status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "TipPool": {
    "status": [
      {
        message: "Invalid tip pool status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "totalTips": [
      {
        message: "Total tips cannot be negative",
        severity: "block",
        constraintName: "totalTipsPositive",
        overrideable: false,
      },
    ],
  },
  "TrainingAssignment": {
    "attemptCount": [
      {
        message: "Attempt count is invalid",
        severity: "block",
        constraintName: "validAttemptCount",
        overrideable: false,
      },
    ],
    "maxAttempts": [
      {
        message: "Attempt count is invalid",
        severity: "block",
        constraintName: "validAttemptCount",
        overrideable: false,
      },
      {
        message: "Max attempts must be between 1 and 10",
        severity: "block",
        constraintName: "validMaxAttempts",
        overrideable: false,
      },
    ],
    "passThresholdPercent": [
      {
        message: "Pass threshold must be between 0 and 100",
        severity: "block",
        constraintName: "validThreshold",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid training assignment status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "TrainingAttempt": {
    "attemptNumber": [
      {
        message: "Attempt number must be positive",
        severity: "block",
        constraintName: "validAttemptNumber",
        overrideable: false,
      },
    ],
    "scorePercent": [
      {
        message: "Score must be between 0 and 100",
        severity: "block",
        constraintName: "validScore",
        overrideable: false,
      },
    ],
  },
  "TrainingCompletion": {
    "score": [
      {
        message: "Score must be between 0 and 100",
        severity: "block",
        constraintName: "scoreRange",
        overrideable: false,
      },
    ],
  },
  "TrainingModule": {
    "category": [
      {
        message: "Invalid training category",
        severity: "block",
        constraintName: "validCategory",
        overrideable: false,
      },
    ],
    "contentType": [
      {
        message: "Invalid content type",
        severity: "block",
        constraintName: "validContentType",
        overrideable: false,
      },
    ],
    "maxAttempts": [
      {
        message: "Max attempts must be between 1 and 10",
        severity: "block",
        constraintName: "validAttempts",
        overrideable: false,
      },
    ],
    "passThresholdPercent": [
      {
        message: "Pass threshold must be between 0 and 100",
        severity: "block",
        constraintName: "validThreshold",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid module status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Title is required",
        severity: "block",
        constraintName: "requireTitle",
        overrideable: false,
      },
    ],
  },
  "TrainingQuestion": {
    "correctOptionKey": [
      {
        message: "Correct option key must be A, B, C, or D",
        severity: "block",
        constraintName: "validAnswerKey",
        overrideable: false,
      },
    ],
    "optionA": [
      {
        message: "Training questions require at least two options",
        severity: "block",
        constraintName: "validOptions",
        overrideable: false,
      },
    ],
    "optionB": [
      {
        message: "Training questions require at least two options",
        severity: "block",
        constraintName: "validOptions",
        overrideable: false,
      },
    ],
    "prompt": [
      {
        message: "Training questions require a prompt",
        severity: "block",
        constraintName: "validPrompt",
        overrideable: false,
      },
    ],
  },
  "User": {
    "employmentType": [
      {
        message: "Invalid employment type",
        severity: "block",
        constraintName: "validEmploymentType",
        overrideable: false,
      },
    ],
    "role": [
      {
        message: "Invalid user role",
        severity: "block",
        constraintName: "validRole",
        overrideable: false,
      },
    ],
    "terminationDate": [
      {
        message: "User 'full name' is already terminated",
        severity: "block",
        constraintName: "blockAlreadyTerminated",
        overrideable: false,
      },
    ],
  },
  "VarianceReport": {
    "status": [
      {
        message: "Invalid variance report status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "variancePct": [
      {
        message: "Approving high-variance report for 'item name' (variance pct% variance)",
        severity: "warn",
        constraintName: "warnHighVariance",
        overrideable: false,
      },
    ],
  },
  "Vehicle": {
    "status": [
      {
        message: "Invalid vehicle status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "Vendor": {
    "paymentTerms": [
      {
        message: "Invalid payment terms",
        severity: "block",
        constraintName: "validPaymentTerms",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid vendor status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "type": [
      {
        message: "Invalid vendor type",
        severity: "block",
        constraintName: "validType",
        overrideable: false,
      },
    ],
  },
  "VendorCatalog": {
    "baseUnitCost": [
      {
        message: "Unit cost must be non-negative",
        severity: "block",
        constraintName: "validUnitCost",
        overrideable: false,
      },
      {
        message: "Price drop of more than 15% for 'item name' — verify with supplier",
        severity: "warn",
        constraintName: "warnLargePriceDecrease",
        overrideable: false,
      },
      {
        message: "Price increase of more than 10% for 'item name' (from base unit cost to new)",
        severity: "warn",
        constraintName: "warnLargePriceIncrease",
        overrideable: true,
      },
    ],
    "currency": [
      {
        message: "Invalid currency",
        severity: "block",
        constraintName: "validCurrency",
        overrideable: false,
      },
    ],
    "isActive": [
      {
        message: "Deleting active catalog entry 'item name'",
        severity: "warn",
        constraintName: "warnActiveEntry",
        overrideable: false,
      },
    ],
    "itemName": [
      {
        message: "Item name is required",
        severity: "block",
        constraintName: "requireItemName",
        overrideable: false,
      },
    ],
    "itemNumber": [
      {
        message: "Item number is required",
        severity: "block",
        constraintName: "requireItemNumber",
        overrideable: false,
      },
    ],
    "unitOfMeasure": [
      {
        message: "Invalid unit of measure",
        severity: "block",
        constraintName: "requireUnitOfMeasure",
        overrideable: false,
      },
    ],
  },
  "VendorContact": {
    "contactName": [
      {
        message: "Contact name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
    "supplierId": [
      {
        message: "Supplier ID is required",
        severity: "block",
        constraintName: "requireSupplier",
        overrideable: false,
      },
    ],
  },
  "VendorContract": {
    "contractType": [
      {
        message: "Invalid contract type",
        severity: "block",
        constraintName: "validContractType",
        overrideable: false,
      },
    ],
    "paymentTerms": [
      {
        message: "Invalid payment terms",
        severity: "block",
        constraintName: "validPaymentTerms",
        overrideable: false,
      },
    ],
    "startDate": [
      {
        message: "Terminating contract 'contract number' before start date",
        severity: "warn",
        constraintName: "warnEarlyTermination",
        overrideable: true,
      },
    ],
    "status": [
      {
        message: "Invalid contract status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "VendorRating": {
    "category": [
      {
        message: "Rating category is required",
        severity: "block",
        constraintName: "requireCategory",
        overrideable: false,
      },
    ],
    "rating": [
      {
        message: "Score must be between 0 and 5",
        severity: "block",
        constraintName: "scoreRange",
        overrideable: false,
      },
      {
        message: "Low vendor rating (rating/5) for category 'category' — consider reviewing supplier",
        severity: "warn",
        constraintName: "warnLowScore",
        overrideable: false,
      },
    ],
  },
  "Venue": {
    "capacity": [
      {
        message: "Capacity cannot be negative",
        severity: "block",
        constraintName: "positiveCapacity",
        overrideable: false,
      },
    ],
    "name": [
      {
        message: "Venue name is required",
        severity: "block",
        constraintName: "requireName",
        overrideable: false,
      },
    ],
  },
  "VersionApproval": {
    "createdAt": [
      {
        message: "Approval pending for days days - may need follow-up",
        severity: "warn",
        constraintName: "warnPendingTooLong",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Approval pending for days days - may need follow-up",
        severity: "warn",
        constraintName: "warnPendingTooLong",
        overrideable: false,
      },
    ],
  },
  "VersionedEntity": {
    "entityId": [
      {
        message: "Entity ID is required",
        severity: "block",
        constraintName: "validEntityId",
        overrideable: false,
      },
    ],
    "entityName": [
      {
        message: "Entity name is required",
        severity: "block",
        constraintName: "validEntityName",
        overrideable: false,
      },
    ],
    "entityType": [
      {
        message: "Entity type is required",
        severity: "block",
        constraintName: "validEntityType",
        overrideable: false,
      },
    ],
    "isLocked": [
      {
        message: "Locking entity 'name' - edits will be blocked",
        severity: "warn",
        constraintName: "warnLock",
        overrideable: false,
      },
    ],
  },
  "WasteEntry": {
    "inventoryItemId": [
      {
        message: "Inventory item is required",
        severity: "block",
        constraintName: "requireInventoryItem",
        overrideable: false,
      },
    ],
    "quantity": [
      {
        message: "Quantity must be positive",
        severity: "block",
        constraintName: "positiveQuantity",
        overrideable: false,
      },
    ],
    "reasonId": [
      {
        message: "Waste reason is required",
        severity: "block",
        constraintName: "requireReason",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid waste entry status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
    "totalCost": [
      {
        message: "Approving low-cost waste entry (total cost) — manual approval usually reserved for high-cost losses",
        severity: "warn",
        constraintName: "warnLowCost",
        overrideable: false,
      },
    ],
    "unitCost": [
      {
        message: "Unit cost cannot be negative",
        severity: "block",
        constraintName: "positiveCost",
        overrideable: false,
      },
    ],
  },
  "Workflow": {
    "name": [
      {
        message: "Workflow name is required",
        severity: "block",
        constraintName: "validName",
        overrideable: false,
      },
      {
        message: "Renaming workflow from 'name' to 'new name'",
        severity: "warn",
        constraintName: "warnNameChange",
        overrideable: false,
      },
    ],
    "triggerConfig": [
      {
        message: "Cannot activate workflow 'name' without trigger configuration",
        severity: "block",
        constraintName: "blockNoTriggerConfig",
        overrideable: false,
      },
    ],
    "triggerType": [
      {
        message: "Trigger type is required",
        severity: "block",
        constraintName: "validTriggerType",
        overrideable: false,
      },
    ],
  },
  "WorkforceOptimization": {
    "optimizationType": [
      {
        message: "Invalid optimization type",
        severity: "block",
        constraintName: "validOptimizationType",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
    ],
  },
  "WorkOrder": {
    "priority": [
      {
        message: "Invalid priority level",
        severity: "block",
        constraintName: "validPriority",
        overrideable: false,
      },
      {
        message: "Critical work order 'title' has not been assigned",
        severity: "warn",
        constraintName: "warnCriticalUnassigned",
        overrideable: false,
      },
    ],
    "scheduledDate": [
      {
        message: "Work order 'title' is past scheduled date",
        severity: "warn",
        constraintName: "warnOverdue",
        overrideable: false,
      },
    ],
    "status": [
      {
        message: "Invalid work order status",
        severity: "block",
        constraintName: "validStatus",
        overrideable: false,
      },
      {
        message: "Critical work order 'title' has not been assigned",
        severity: "warn",
        constraintName: "warnCriticalUnassigned",
        overrideable: false,
      },
      {
        message: "Work order 'title' is past scheduled date",
        severity: "warn",
        constraintName: "warnOverdue",
        overrideable: false,
      },
    ],
    "title": [
      {
        message: "Title is required",
        severity: "block",
        constraintName: "requireTitle",
        overrideable: false,
      },
    ],
    "type": [
      {
        message: "Invalid work order type",
        severity: "block",
        constraintName: "validType",
        overrideable: false,
      },
    ],
  },
};
