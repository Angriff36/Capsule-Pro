-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'published', 'failed');

-- CreateEnum
CREATE TYPE "webhook_event_type" AS ENUM ('created', 'updated', 'deleted');

-- CreateEnum
CREATE TYPE "webhook_status" AS ENUM ('active', 'inactive', 'disabled');

-- CreateEnum
CREATE TYPE "webhook_delivery_status" AS ENUM ('pending', 'success', 'failed', 'retrying', 'dead_letter');

-- CreateEnum
CREATE TYPE "action_type" AS ENUM ('insert', 'update', 'delete');

-- CreateEnum
CREATE TYPE "admin_action" AS ENUM ('login', 'logout', 'create', 'update', 'delete', 'view', 'permission_change', 'role_change', 'account_change', 'security_change');

-- CreateEnum
CREATE TYPE "admin_entity_type" AS ENUM ('admin_users', 'admin_roles', 'admin_permissions', 'admin_audit_trail', 'users', 'roles', 'permissions', 'tenants', 'reports', 'settings');

-- CreateEnum
CREATE TYPE "email_status" AS ENUM ('pending', 'sent', 'delivered', 'opened', 'failed', 'bounced');

-- CreateEnum
CREATE TYPE "sms_status" AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "SentryFixJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "unit_system" AS ENUM ('metric', 'imperial', 'custom');

-- CreateEnum
CREATE TYPE "unit_type" AS ENUM ('volume', 'weight', 'count', 'length', 'temperature', 'time');

-- CreateEnum
CREATE TYPE "sms_automation_trigger_type" AS ENUM ('task_assigned', 'task_completed', 'task_overdue', 'shift_assigned', 'shift_reminder', 'shift_changed', 'clock_in_reminder', 'clock_out_reminder', 'prep_list_published', 'inventory_low', 'custom_event');

-- CreateEnum
CREATE TYPE "sms_recipient_type" AS ENUM ('employee', 'role_based', 'custom_phone', 'manager');

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('super_admin', 'tenant_admin', 'finance_manager', 'operations_manager', 'staff_manager', 'read_only');

-- CreateTable
CREATE TABLE "AdminChatParticipant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT DEFAULT '',
    "userId" TEXT DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdminChatParticipant_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AdminTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'backlog',
    "priority" TEXT DEFAULT 'medium',
    "category" TEXT DEFAULT '',
    "assignedTo" TEXT DEFAULT '',
    "dueDate" TEXT DEFAULT '',
    "createdBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdminTask_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AiEventSetupSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalInput" TEXT DEFAULT '',
    "parsedTitle" TEXT DEFAULT '',
    "parsedEventType" TEXT DEFAULT '',
    "parsedEventDate" TIMESTAMP(3),
    "parsedGuestCount" INTEGER DEFAULT 0,
    "parsedVenueName" TEXT DEFAULT '',
    "parsedVenueAddress" TEXT DEFAULT '',
    "parsedNotes" TEXT DEFAULT '',
    "parsedTags" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "confidence" DECIMAL(12,2) DEFAULT 0,
    "missingFields" TEXT DEFAULT '[]',
    "suggestions" TEXT DEFAULT '[]',
    "createdEventId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiEventSetupSession_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AlertsConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" TEXT DEFAULT '',
    "destination" TEXT DEFAULT '',

    CONSTRAINT "AlertsConfig_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AllergenWarning" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT DEFAULT '',
    "dishId" TEXT DEFAULT '',
    "warningType" TEXT DEFAULT '',
    "allergens" TEXT DEFAULT '',
    "affectedGuests" TEXT DEFAULT '',
    "severity" TEXT DEFAULT 'warning',
    "isAcknowledged" BOOLEAN DEFAULT false,
    "acknowledgedBy" TEXT DEFAULT '',
    "acknowledgedAt" TIMESTAMP(3),
    "overrideReason" TEXT DEFAULT '',
    "resolved" BOOLEAN DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AllergenWarning_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "keyPrefix" TEXT NOT NULL DEFAULT '',
    "hashedKey" TEXT NOT NULL DEFAULT '',
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "routingNumber" TEXT NOT NULL,
    "accountType" TEXT DEFAULT 'checking',
    "bankName" TEXT DEFAULT '',
    "isDefault" BOOLEAN DEFAULT false,
    "status" TEXT DEFAULT 'active',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "BattleBoard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT DEFAULT '',
    "boardName" TEXT DEFAULT '',
    "boardType" TEXT DEFAULT 'event-specific',
    "schemaVersion" TEXT DEFAULT 'mangia-battle-board@1',
    "boardData" TEXT DEFAULT '{}',
    "documentUrl" TEXT DEFAULT '',
    "sourceDocumentType" TEXT DEFAULT '',
    "documentImportedAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'draft',
    "isTemplate" BOOLEAN DEFAULT false,
    "description" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "tags" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "dishCount" INTEGER DEFAULT 0,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BattleBoard_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "fiscalYear" INTEGER DEFAULT 0,
    "totalAmount" DECIMAL(12,2) DEFAULT 0,
    "allocatedAmount" DECIMAL(12,2) DEFAULT 0,
    "spentAmount" DECIMAL(12,2) DEFAULT 0,
    "status" TEXT DEFAULT 'draft',
    "category" TEXT DEFAULT 'general',
    "departmentId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "BulkOrderRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "catalogEntryId" TEXT NOT NULL,
    "ruleName" TEXT DEFAULT '',
    "minimumQuantity" INTEGER NOT NULL DEFAULT 1,
    "ruleType" TEXT NOT NULL DEFAULT 'discount',
    "thresholdQuantity" INTEGER DEFAULT 0,
    "action" TEXT DEFAULT 'discount',
    "discountPercent" DECIMAL(12,2) DEFAULT 0,
    "freeItemQuantity" INTEGER DEFAULT 0,
    "shippingIncluded" BOOLEAN DEFAULT false,
    "priority" INTEGER DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BulkOrderRule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CateringOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT DEFAULT '',
    "eventId" TEXT DEFAULT '',
    "orderStatus" TEXT DEFAULT 'draft',
    "orderDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "deliveryTime" TEXT DEFAULT '',
    "subtotalAmount" DECIMAL(12,2) DEFAULT 0,
    "taxAmount" DECIMAL(12,2) DEFAULT 0,
    "discountAmount" DECIMAL(12,2) DEFAULT 0,
    "serviceChargeAmount" DECIMAL(12,2) DEFAULT 0,
    "totalAmount" DECIMAL(12,2) DEFAULT 0,
    "depositRequired" BOOLEAN DEFAULT false,
    "depositAmount" DECIMAL(12,2) DEFAULT 0,
    "depositPaid" BOOLEAN DEFAULT false,
    "depositPaidAt" TIMESTAMP(3),
    "venueName" TEXT DEFAULT '',
    "venueAddress" TEXT DEFAULT '',
    "venueCity" TEXT DEFAULT '',
    "venueState" TEXT DEFAULT '',
    "venueZip" TEXT DEFAULT '',
    "venueContactName" TEXT DEFAULT '',
    "venueContactPhone" TEXT DEFAULT '',
    "guestCount" INTEGER DEFAULT 0,
    "specialInstructions" TEXT DEFAULT '',
    "dietaryRestrictions" TEXT DEFAULT '',
    "staffRequired" INTEGER DEFAULT 0,
    "staffAssigned" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CateringOrder_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ChartOfAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountNumber" TEXT DEFAULT '',
    "accountName" TEXT DEFAULT '',
    "accountType" TEXT DEFAULT '',
    "parentId" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ClientInteraction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT DEFAULT '',
    "leadId" TEXT DEFAULT '',
    "employeeId" TEXT DEFAULT '',
    "interactionType" TEXT DEFAULT 'note',
    "interactionDate" TIMESTAMP(3),
    "subject" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "followUpDate" TIMESTAMP(3),
    "followUpCompleted" BOOLEAN DEFAULT false,
    "correlationId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClientInteraction_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'company',
    "companyName" TEXT DEFAULT '',
    "firstName" TEXT DEFAULT '',
    "lastName" TEXT DEFAULT '',
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "website" TEXT DEFAULT '',
    "addressLine1" TEXT DEFAULT '',
    "addressLine2" TEXT DEFAULT '',
    "city" TEXT DEFAULT '',
    "stateProvince" TEXT DEFAULT '',
    "postalCode" TEXT DEFAULT '',
    "countryCode" TEXT DEFAULT '',
    "defaultPaymentTerms" DECIMAL(12,2) DEFAULT 30,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxId" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "tags" TEXT[],
    "source" TEXT DEFAULT '',
    "assignedTo" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT DEFAULT '',
    "lastName" TEXT DEFAULT '',
    "title" TEXT DEFAULT '',
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "phoneMobile" TEXT DEFAULT '',
    "isPrimary" BOOLEAN DEFAULT false,
    "isBillingContact" BOOLEAN DEFAULT false,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ClientPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "preferenceType" TEXT DEFAULT '',
    "preferenceKey" TEXT DEFAULT '',
    "preferenceValue" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClientPreference_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CollectionCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL DEFAULT '',
    "invoiceNumber" TEXT NOT NULL DEFAULT '',
    "eventId" TEXT NOT NULL DEFAULT '',
    "clientId" TEXT NOT NULL DEFAULT '',
    "clientName" TEXT NOT NULL DEFAULT '',
    "originalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "collectedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dunningStage" TEXT NOT NULL DEFAULT 'CURRENT',
    "daysOverdue" INTEGER NOT NULL DEFAULT 0,
    "agingBucket" TEXT DEFAULT '',
    "assignedTo" TEXT DEFAULT '',
    "assignedAt" TIMESTAMP(3),
    "hasPaymentPlan" BOOLEAN DEFAULT false,
    "paymentPlanId" TEXT DEFAULT '',
    "nextPaymentDue" TIMESTAMP(3),
    "isDisputed" BOOLEAN DEFAULT false,
    "disputeReason" TEXT DEFAULT '',
    "disputeResolvedAt" TIMESTAMP(3),
    "isEscalatedToLegal" BOOLEAN DEFAULT false,
    "legalCaseNumber" TEXT DEFAULT '',
    "legalFirm" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "internalNotes" TEXT DEFAULT '',
    "lastActivityAt" TIMESTAMP(3),
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "CollectionCase_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CollectionAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL DEFAULT '',
    "actionType" TEXT NOT NULL DEFAULT '',
    "direction" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "contactedBy" TEXT DEFAULT '',
    "contactName" TEXT DEFAULT '',
    "contactMethod" TEXT DEFAULT '',
    "subject" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "outcome" TEXT DEFAULT '',
    "nextActionDate" TIMESTAMP(3),
    "promiseAmount" DECIMAL(12,2) DEFAULT 0,
    "promiseDate" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "metadata" TEXT DEFAULT '{}',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionAction_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CollectionPaymentPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL DEFAULT '',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "installmentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "completedInstallments" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "frequency" TEXT DEFAULT '',
    "nextPaymentDate" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "defaultedAt" TIMESTAMP(3),

    CONSTRAINT "CollectionPaymentPlan_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CommandBoard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT DEFAULT '',
    "name" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'draft',
    "isTemplate" BOOLEAN DEFAULT false,
    "tags" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommandBoard_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CommandBoardCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "content" TEXT DEFAULT '',
    "cardType" TEXT DEFAULT 'task',
    "status" TEXT DEFAULT 'pending',
    "positionX" DECIMAL(12,2) DEFAULT 0,
    "positionY" DECIMAL(12,2) DEFAULT 0,
    "width" DECIMAL(12,2) DEFAULT 200,
    "height" DECIMAL(12,2) DEFAULT 150,
    "zIndex" INTEGER DEFAULT 0,
    "color" TEXT DEFAULT '',
    "metadata" TEXT DEFAULT '{}',
    "groupId" TEXT DEFAULT '',
    "entityId" TEXT DEFAULT '',
    "entityType" TEXT DEFAULT '',
    "version" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommandBoardCard_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CommandBoardGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "color" TEXT DEFAULT '',
    "collapsed" BOOLEAN DEFAULT false,
    "positionX" DECIMAL(12,2) DEFAULT 0,
    "positionY" DECIMAL(12,2) DEFAULT 0,
    "width" DECIMAL(12,2) DEFAULT 300,
    "height" DECIMAL(12,2) DEFAULT 200,
    "zIndex" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommandBoardGroup_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CommandBoardConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "fromCardId" TEXT NOT NULL,
    "toCardId" TEXT NOT NULL,
    "relationshipType" TEXT DEFAULT 'generic',
    "label" TEXT DEFAULT '',
    "visible" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommandBoardConnection_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CommandBoardLayout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "viewport" TEXT DEFAULT '{}',
    "visibleCards" TEXT DEFAULT '',
    "gridSize" INTEGER DEFAULT 40,
    "showGrid" BOOLEAN DEFAULT true,
    "snapToGrid" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommandBoardLayout_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "containerType" TEXT NOT NULL,
    "locationId" TEXT DEFAULT '',
    "sizeDescription" TEXT DEFAULT '',
    "capacityVolumeMl" DECIMAL(12,2) DEFAULT 0,
    "capacityWeightG" DECIMAL(12,2) DEFAULT 0,
    "capacityPortions" INTEGER DEFAULT 0,
    "isReusable" BOOLEAN DEFAULT true,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Container_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ProposalTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "headerHtml" TEXT DEFAULT '',
    "footerHtml" TEXT DEFAULT '',
    "defaultTerms" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProposalTemplate_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "InteractionAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientInteractionId" TEXT DEFAULT '',
    "fileName" TEXT DEFAULT '',
    "fileUrl" TEXT DEFAULT '',
    "fileType" TEXT DEFAULT '',
    "fileSizeBytes" INTEGER DEFAULT 0,
    "uploadedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InteractionAttachment_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CrmScoringRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "criterion" TEXT DEFAULT '',
    "points" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CrmScoringRule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "reportType" TEXT DEFAULT '',
    "queryConfig" TEXT DEFAULT '{}',
    "displayConfig" TEXT DEFAULT '{}',
    "isShared" BOOLEAN DEFAULT false,
    "createdBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "documentType" TEXT DEFAULT '',
    "fileUrl" TEXT DEFAULT '',
    "fileSizeBytes" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'uploaded',
    "entityType" TEXT DEFAULT '',
    "entityId" TEXT DEFAULT '',
    "uploadedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AdminChatThread" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subject" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'open',
    "createdBy" TEXT DEFAULT '',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AdminChatThread_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AdminChatMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adminChatThreadId" TEXT DEFAULT '',
    "senderId" TEXT DEFAULT '',
    "body" TEXT DEFAULT '',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdminChatMessage_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CycleCountSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "countType" TEXT DEFAULT 'ad_hoc',
    "scheduledDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'draft',
    "totalItems" INTEGER DEFAULT 0,
    "countedItems" INTEGER DEFAULT 0,
    "totalVariance" DECIMAL(12,2) DEFAULT 0,
    "variancePercentage" DECIMAL(12,2) DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdById" TEXT DEFAULT '',
    "approvedById" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CycleCountSession_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CycleCountRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "storageLocationId" TEXT NOT NULL,
    "expectedQuantity" INTEGER DEFAULT 0,
    "countedQuantity" INTEGER DEFAULT 0,
    "variance" DECIMAL(12,2) DEFAULT 0,
    "variancePct" DECIMAL(12,2) DEFAULT 0,
    "countDate" TIMESTAMP(3),
    "countedById" TEXT DEFAULT '',
    "barcode" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "isVerified" BOOLEAN DEFAULT false,
    "verifiedById" TEXT DEFAULT '',
    "verifiedAt" TIMESTAMP(3),
    "syncStatus" TEXT DEFAULT 'synced',
    "offlineId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CycleCountRecord_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "VarianceReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "expectedQuantity" INTEGER DEFAULT 0,
    "countedQuantity" INTEGER DEFAULT 0,
    "variance" DECIMAL(12,2) DEFAULT 0,
    "variancePct" DECIMAL(12,2) DEFAULT 0,
    "accuracyScore" DECIMAL(12,2) DEFAULT 0,
    "status" TEXT DEFAULT 'pending',
    "adjustmentType" TEXT DEFAULT '',
    "adjustmentAmount" DECIMAL(12,2) DEFAULT 0,
    "adjustmentDate" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VarianceReport_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(12,2) DEFAULT 0,
    "currency" TEXT DEFAULT 'USD',
    "stage" TEXT DEFAULT 'new',
    "status" TEXT DEFAULT 'open',
    "probability" DECIMAL(12,2) DEFAULT 0,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "assignedTo" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Dish" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "category" TEXT DEFAULT '',
    "serviceStyle" TEXT DEFAULT '',
    "defaultContainerId" TEXT DEFAULT '',
    "presentationImageUrl" TEXT DEFAULT '',
    "minPrepLeadDays" INTEGER DEFAULT 0,
    "maxPrepLeadDays" INTEGER DEFAULT 0,
    "portionSizeDescription" TEXT DEFAULT '',
    "dietaryTags" TEXT DEFAULT '',
    "allergens" TEXT DEFAULT '',
    "pricePerPerson" DECIMAL(12,2) DEFAULT 0,
    "costPerPerson" DECIMAL(12,2) DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changeDescription" TEXT DEFAULT '',
    "createdBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "templateType" TEXT DEFAULT 'custom',
    "subject" TEXT DEFAULT '',
    "body" TEXT DEFAULT '',
    "mergeFields" TEXT DEFAULT '[]',
    "isActive" BOOLEAN DEFAULT true,
    "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EmailWorkflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "triggerType" TEXT DEFAULT 'custom',
    "triggerConfig" TEXT DEFAULT '{}',
    "emailTemplateId" TEXT DEFAULT '',
    "recipientConfig" TEXT DEFAULT '{}',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmailWorkflow_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EmployeeAvailability" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT DEFAULT '',
    "dayOfWeek" INTEGER DEFAULT 0,
    "startTime" TEXT DEFAULT '',
    "endTime" TEXT DEFAULT '',
    "isAvailable" BOOLEAN DEFAULT true,
    "effectiveFrom" TEXT DEFAULT '',
    "effectiveUntil" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmployeeAvailability_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EmployeeCertification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT DEFAULT '',
    "certificationType" TEXT DEFAULT '',
    "certificationName" TEXT DEFAULT '',
    "issuedDate" TEXT DEFAULT '',
    "expiryDate" TEXT DEFAULT '',
    "documentUrl" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmployeeCertification_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'active',
    "serialNumber" TEXT DEFAULT '',
    "manufacturer" TEXT DEFAULT '',
    "model" TEXT DEFAULT '',
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "maintenanceIntervalDays" INTEGER DEFAULT 90,
    "usageHours" INTEGER DEFAULT 0,
    "maxUsageHours" INTEGER DEFAULT 1000,
    "condition" TEXT DEFAULT 'good',
    "notes" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "MaintenanceWorkOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "equipmentName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'repair',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT DEFAULT '',
    "assignedTo" TEXT DEFAULT '',
    "estimatedCost" DECIMAL(12,2) DEFAULT 0,
    "actualCost" DECIMAL(12,2) DEFAULT 0,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "partsUsed" TEXT DEFAULT '',
    "vendorId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MaintenanceWorkOrder_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AutomatedFollowup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT DEFAULT 'email',
    "status" TEXT DEFAULT 'pending',
    "scheduledDate" TIMESTAMP(3),
    "sentDate" TIMESTAMP(3),
    "recipientId" TEXT DEFAULT '',
    "subject" TEXT DEFAULT '',
    "body" TEXT DEFAULT '',
    "templateId" TEXT DEFAULT '',
    "errorMessage" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AutomatedFollowup_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventTimelineItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "itemType" TEXT DEFAULT 'task',
    "status" TEXT DEFAULT 'pending',
    "assignedTo" TEXT DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "EventTimelineItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventWaitlistEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "partySize" INTEGER DEFAULT 1,
    "status" TEXT DEFAULT 'waiting',
    "notes" TEXT DEFAULT '',
    "joinedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "EventWaitlistEntry_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventBudget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "version" INTEGER DEFAULT 1,
    "status" TEXT DEFAULT 'draft',
    "totalBudgetAmount" DECIMAL(12,2) DEFAULT 0,
    "totalActualAmount" DECIMAL(12,2) DEFAULT 0,
    "varianceAmount" DECIMAL(12,2) DEFAULT 0,
    "variancePercentage" DECIMAL(12,2) DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventBudget_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "BudgetLineItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "budgetedAmount" DECIMAL(12,2) DEFAULT 0,
    "actualAmount" DECIMAL(12,2) DEFAULT 0,
    "varianceAmount" DECIMAL(12,2) DEFAULT 0,
    "sortOrder" INTEGER DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BudgetLineItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractNumber" TEXT DEFAULT '',
    "title" TEXT DEFAULT 'Untitled Contract',
    "status" TEXT DEFAULT 'draft',
    "documentUrl" TEXT DEFAULT '',
    "documentType" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventContract_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ContractSignature" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signatureData" TEXT DEFAULT '',
    "signerName" TEXT DEFAULT '',
    "signerEmail" TEXT DEFAULT '',
    "ipAddress" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContractSignature_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventDish" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "quantity" INTEGER DEFAULT 1,
    "notes" TEXT DEFAULT '',
    "courseLabel" TEXT DEFAULT '',
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventDish_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventGuest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT DEFAULT '',
    "guestName" TEXT DEFAULT '',
    "guestEmail" TEXT DEFAULT '',
    "guestPhone" TEXT DEFAULT '',
    "isPrimaryContact" BOOLEAN DEFAULT false,
    "dietaryRestrictions" TEXT DEFAULT '',
    "allergenRestrictions" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "specialMealRequired" BOOLEAN DEFAULT false,
    "specialMealNotes" TEXT DEFAULT '',
    "tableAssignment" TEXT DEFAULT '',
    "mealPreference" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventImportWorkflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT DEFAULT '',
    "idempotencyKey" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'created',
    "currentStep" INTEGER DEFAULT 0,
    "totalSteps" INTEGER DEFAULT 6,
    "inputData" TEXT DEFAULT '{}',
    "outputData" TEXT DEFAULT '{}',
    "stepResults" TEXT DEFAULT '{}',
    "errors" TEXT DEFAULT '[]',
    "warnings" TEXT DEFAULT '[]',
    "confidence" DECIMAL(12,2) DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "EventImportWorkflow_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT DEFAULT '2025-01-01',
    "status" TEXT DEFAULT 'draft',
    "completion" DECIMAL(12,2) DEFAULT 0,
    "checklistData" TEXT DEFAULT '{}',
    "parsedEventData" TEXT DEFAULT '',
    "reportConfig" TEXT DEFAULT '',
    "autoFillScore" DECIMAL(12,2) DEFAULT 0,
    "reviewNotes" TEXT DEFAULT '',
    "reviewedBy" TEXT DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventReport_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT DEFAULT '',
    "eventNumber" TEXT DEFAULT '',
    "title" TEXT NOT NULL DEFAULT 'Untitled Event',
    "eventType" TEXT NOT NULL DEFAULT 'general',
    "eventDate" TIMESTAMP(3) NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "budget" DECIMAL(12,2) DEFAULT 0,
    "ticketPrice" DECIMAL(12,2) DEFAULT 0,
    "ticketTier" TEXT DEFAULT '',
    "eventFormat" TEXT DEFAULT '',
    "accessibilityOptions" TEXT[],
    "featuredMediaUrl" TEXT DEFAULT '',
    "locationId" TEXT DEFAULT '',
    "venueId" TEXT DEFAULT '',
    "venueEntityId" TEXT DEFAULT '',
    "assignedTo" TEXT DEFAULT '',
    "venueName" TEXT DEFAULT '',
    "venueAddress" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventProfitability" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "budgetedRevenue" DECIMAL(12,2) DEFAULT 0,
    "budgetedFoodCost" DECIMAL(12,2) DEFAULT 0,
    "budgetedLaborCost" DECIMAL(12,2) DEFAULT 0,
    "budgetedOverhead" DECIMAL(12,2) DEFAULT 0,
    "budgetedTotalCost" DECIMAL(12,2) DEFAULT 0,
    "budgetedGrossMargin" DECIMAL(12,2) DEFAULT 0,
    "budgetedGrossMarginPct" DECIMAL(12,2) DEFAULT 0,
    "actualRevenue" DECIMAL(12,2) DEFAULT 0,
    "actualFoodCost" DECIMAL(12,2) DEFAULT 0,
    "actualLaborCost" DECIMAL(12,2) DEFAULT 0,
    "actualOverhead" DECIMAL(12,2) DEFAULT 0,
    "actualTotalCost" DECIMAL(12,2) DEFAULT 0,
    "actualGrossMargin" DECIMAL(12,2) DEFAULT 0,
    "actualGrossMarginPct" DECIMAL(12,2) DEFAULT 0,
    "revenueVariance" DECIMAL(12,2) DEFAULT 0,
    "foodCostVariance" DECIMAL(12,2) DEFAULT 0,
    "laborCostVariance" DECIMAL(12,2) DEFAULT 0,
    "totalCostVariance" DECIMAL(12,2) DEFAULT 0,
    "marginVariancePct" DECIMAL(12,2) DEFAULT 0,
    "calculatedAt" TIMESTAMP(3),
    "calculationMethod" TEXT DEFAULT 'auto',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventProfitability_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventSummary" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "highlights" TEXT DEFAULT '[]',
    "issues" TEXT DEFAULT '[]',
    "financialPerformance" TEXT DEFAULT '[]',
    "clientFeedback" TEXT DEFAULT '[]',
    "insights" TEXT DEFAULT '[]',
    "overallSummary" TEXT DEFAULT '',
    "generatedAt" TIMESTAMP(3),
    "generationDurationMs" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventSummary_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventStaff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "role" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "shiftStart" INTEGER DEFAULT 0,
    "shiftEnd" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'assigned',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventStaff_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "address" TEXT DEFAULT '',
    "capacity" INTEGER DEFAULT 0,
    "contactName" TEXT DEFAULT '',
    "contactPhone" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventStaffAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "role" TEXT DEFAULT '',
    "shiftStart" TIMESTAMP(3),
    "shiftEnd" TIMESTAMP(3),
    "status" TEXT DEFAULT 'assigned',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventStaffAssignment_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventTimeline" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3),
    "durationMinutes" INTEGER DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventTimeline_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TimelineTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "dueAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',
    "assignedTo" TEXT DEFAULT '',
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TimelineTask_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventImport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "totalRows" INTEGER DEFAULT 0,
    "importedRows" INTEGER DEFAULT 0,
    "errorMessage" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventImport_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventFollowup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '',
    "dueAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',
    "assignedTo" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventFollowup_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "BoardProjection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT '',
    "entityId" TEXT NOT NULL DEFAULT '',
    "positionX" DECIMAL(12,2) DEFAULT 0,
    "positionY" DECIMAL(12,2) DEFAULT 0,
    "width" DECIMAL(12,2) DEFAULT 200,
    "height" DECIMAL(12,2) DEFAULT 150,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BoardProjection_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "BoardAnnotation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "text" TEXT DEFAULT '',
    "positionX" DECIMAL(12,2) DEFAULT 0,
    "positionY" DECIMAL(12,2) DEFAULT 0,
    "color" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BoardAnnotation_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT DEFAULT '',
    "color" TEXT DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entityType" TEXT DEFAULT '',
    "entityId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Note_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT DEFAULT 'venue',
    "address" TEXT DEFAULT '',
    "city" TEXT DEFAULT '',
    "state" TEXT DEFAULT '',
    "zip" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'active',
    "capacity" INTEGER DEFAULT 0,
    "description" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "FacilityArea" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "venueId" TEXT DEFAULT '',
    "name" TEXT NOT NULL,
    "code" TEXT DEFAULT '',
    "areaType" TEXT DEFAULT 'other',
    "floor" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "squareFeet" DECIMAL(12,2) DEFAULT 0,
    "status" TEXT DEFAULT 'active',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "FacilityArea_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "FacilityAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "facilityId" TEXT DEFAULT '',
    "areaId" TEXT DEFAULT '',
    "name" TEXT NOT NULL,
    "assetType" TEXT DEFAULT 'other',
    "assetClass" TEXT DEFAULT 'fixed',
    "status" TEXT DEFAULT 'operational',
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DECIMAL(12,2) DEFAULT 0,
    "currentValue" DECIMAL(12,2) DEFAULT 0,
    "depreciationRate" DECIMAL(12,2) DEFAULT 0,
    "serialNumber" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "FacilityAsset_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "FacilitySchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "facilityId" TEXT DEFAULT '',
    "areaId" TEXT DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "scheduleType" TEXT DEFAULT 'maintenance',
    "status" TEXT DEFAULT 'scheduled',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "assignedTo" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "FacilitySchedule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "FacilityWorkOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "facilityId" TEXT DEFAULT '',
    "areaId" TEXT DEFAULT '',
    "assetId" TEXT DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "priority" TEXT DEFAULT 'medium',
    "status" TEXT DEFAULT 'open',
    "category" TEXT DEFAULT 'repair',
    "requestedBy" TEXT DEFAULT '',
    "assignedTo" TEXT DEFAULT '',
    "estimatedCost" DECIMAL(12,2) DEFAULT 0,
    "actualCost" DECIMAL(12,2) DEFAULT 0,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "FacilityWorkOrder_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT DEFAULT '',
    "defaultUnitId" INTEGER DEFAULT 0,
    "densityGPerMl" DECIMAL(12,2) DEFAULT 0,
    "shelfLifeDays" INTEGER DEFAULT 0,
    "storageInstructions" TEXT DEFAULT '',
    "allergens" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageType" TEXT NOT NULL,
    "temperatureZone" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "InventoryStock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "storageLocationId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitId" TEXT NOT NULL,
    "lastCountedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryStock_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "InventoryAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "triggeredAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT DEFAULT '',
    "resolvedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "InventoryForecast" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "projectedQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "confidence" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryForecast_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ForecastInput" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "inputDate" TIMESTAMP(3) NOT NULL,
    "actualUsage" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ForecastInput_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ReorderSuggestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "suggestedQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ReorderSuggestion_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "VendorContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventorySupplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "role" TEXT DEFAULT '',
    "isPrimary" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VendorContact_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "VendorRating" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventorySupplierId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comment" TEXT DEFAULT '',
    "ratedAt" TIMESTAMP(3),
    "ratedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "VendorRating_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "InventoryTransferItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryTransferId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryTransferItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ProcurementBudget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "budgetAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "spentAmount" DECIMAL(12,2) DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProcurementBudget_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ProcurementBudgetAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "procurementBudgetId" TEXT NOT NULL,
    "thresholdPct" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT DEFAULT '',
    "isAcknowledged" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProcurementBudgetAlert_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AuditSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AuditSchedule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "item_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "category" TEXT NOT NULL,
    "unitOfMeasure" TEXT DEFAULT 'each',
    "unitCost" DECIMAL(12,2) DEFAULT 0,
    "quantityOnHand" INTEGER DEFAULT 0,
    "parLevel" DECIMAL(12,2) DEFAULT 0,
    "reorder_level" DECIMAL(12,2) DEFAULT 0,
    "supplierId" TEXT DEFAULT '',
    "tags" TEXT DEFAULT '',
    "fsa_status" TEXT DEFAULT 'unknown',
    "fsa_temp_logged" BOOLEAN DEFAULT false,
    "fsa_allergen_info" BOOLEAN DEFAULT false,
    "fsa_traceable" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "InventorySupplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierNumber" TEXT DEFAULT '',
    "contactPerson" TEXT DEFAULT '',
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "paymentTerms" TEXT DEFAULT 'NET_30',
    "notes" TEXT DEFAULT '',
    "tags" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "openPOCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InventorySupplier_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" INTEGER DEFAULT 0,
    "unitCost" DECIMAL(12,2) DEFAULT 0,
    "totalCost" DECIMAL(12,2) DEFAULT 0,
    "reference" TEXT DEFAULT '',
    "referenceType" TEXT DEFAULT '',
    "referenceId" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "reason" TEXT DEFAULT '',
    "employeeId" TEXT DEFAULT '',
    "storageLocationId" TEXT DEFAULT '',
    "transactionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromLocationId" TEXT DEFAULT '',
    "toLocationId" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'draft',
    "requestedBy" TEXT DEFAULT '',
    "approvedBy" TEXT DEFAULT '',
    "shippedBy" TEXT DEFAULT '',
    "receivedBy" TEXT DEFAULT '',
    "shipDate" TIMESTAMP(3),
    "receiveDate" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "items" TEXT DEFAULT '[]',

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'FINAL_PAYMENT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL DEFAULT '',
    "eventId" TEXT NOT NULL DEFAULT '',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "depositPercentage" DECIMAL(12,2) DEFAULT 0,
    "depositRequired" DECIMAL(12,2) DEFAULT 0,
    "depositPaid" DECIMAL(12,2) DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "overdueSince" TIMESTAMP(3),
    "reminderCount" INTEGER DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "quickBooksId" TEXT DEFAULT '',
    "goodshuffleId" TEXT DEFAULT '',
    "externalSyncStatus" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "internalNotes" TEXT DEFAULT '',
    "lineItems" TEXT DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TemperatureProbe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "minThreshold" DECIMAL(12,2) NOT NULL,
    "maxThreshold" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "lastCalibratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TemperatureProbe_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TemperatureLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "temperature" DECIMAL(12,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "withinRange" BOOLEAN NOT NULL,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TemperatureLog_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TemperatureReading" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "probeId" TEXT NOT NULL,
    "temperature" DECIMAL(12,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "withinRange" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TemperatureReading_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "IotAlertRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "threshold" DECIMAL(12,2) NOT NULL,
    "comparison" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "IotAlertRule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "IoTAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "probeId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "triggeredAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedBy" TEXT DEFAULT '',
    "resolvedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "IoTAlert_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "performedAt" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "QualityCheckItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "qualityCheckId" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "passed" BOOLEAN DEFAULT false,
    "notes" TEXT DEFAULT '',
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "QualityCheckItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "KitchenTaskClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kitchenTaskId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "KitchenTaskClaim_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "KitchenTaskProgress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kitchenTaskId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progressPct" DECIMAL(12,2) NOT NULL,
    "note" TEXT DEFAULT '',
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "KitchenTaskProgress_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TaskBundle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventId" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TaskBundle_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TaskBundleItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskBundleId" TEXT NOT NULL,
    "kitchenTaskId" TEXT NOT NULL,
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TaskBundleItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "BulkCombineRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matchCriteria" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "BulkCombineRule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "MethodVideo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prepMethodId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "durationSeconds" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MethodVideo_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PrepListImport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "importedAt" TIMESTAMP(3),
    "errorMessage" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PrepListImport_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "KitchenTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER DEFAULT 5,
    "complexity" DECIMAL(12,2) DEFAULT 5,
    "tags" TEXT DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "KitchenTask_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT DEFAULT 'general',
    "content" TEXT DEFAULT '',
    "tags" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'draft',
    "authorId" TEXT DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "viewCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgeBaseEntry_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "LaborBudget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT DEFAULT '',
    "periodStart" TEXT DEFAULT '',
    "periodEnd" TEXT DEFAULT '',
    "budgetAmount" DECIMAL(12,2) DEFAULT 0,
    "budgetType" TEXT DEFAULT 'weekly',
    "notes" TEXT DEFAULT '',
    "createdBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LaborBudget_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "budgetId" TEXT DEFAULT '',
    "alertType" TEXT DEFAULT '',
    "isAcknowledged" BOOLEAN DEFAULT false,
    "acknowledgedBy" TEXT DEFAULT '',
    "acknowledgedAt" TIMESTAMP(3),
    "resolved" BOOLEAN DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT DEFAULT '',
    "companyName" TEXT DEFAULT '',
    "contactName" TEXT DEFAULT '',
    "contactEmail" TEXT DEFAULT '',
    "contactPhone" TEXT DEFAULT '',
    "eventType" TEXT DEFAULT '',
    "eventDate" TIMESTAMP(3),
    "estimatedGuests" INTEGER DEFAULT 0,
    "estimatedValue" DECIMAL(12,2) DEFAULT 0,
    "status" TEXT DEFAULT 'new',
    "assignedTo" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "convertedToClientId" TEXT DEFAULT '',
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "licenseNumber" TEXT DEFAULT '',
    "licenseExpiry" TIMESTAMP(3),
    "status" TEXT DEFAULT 'active',
    "currentVehicleId" TEXT DEFAULT '',
    "rating" DECIMAL(12,2) DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT DEFAULT 'delivery',
    "plateNumber" TEXT DEFAULT '',
    "vin" TEXT DEFAULT '',
    "make" TEXT DEFAULT '',
    "model" TEXT DEFAULT '',
    "year" INTEGER DEFAULT 0,
    "capacity" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'available',
    "currentDriverId" TEXT DEFAULT '',
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "LogisticsRoute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT DEFAULT 'planned',
    "vehicleId" TEXT DEFAULT '',
    "driverId" TEXT DEFAULT '',
    "startLocation" TEXT DEFAULT '',
    "endLocation" TEXT DEFAULT '',
    "distance" DECIMAL(12,2) DEFAULT 0,
    "estimatedDuration" DECIMAL(12,2) DEFAULT 0,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "stops" DECIMAL(12,2) DEFAULT 0,
    "completedStops" INTEGER DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "LogisticsRoute_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "LogisticsDispatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "driverId" TEXT DEFAULT '',
    "vehicleId" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "priority" TEXT DEFAULT 'normal',
    "estimatedDeliveryTime" TIMESTAMP(3),
    "actualDeliveryTime" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "LogisticsDispatch_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "category" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "basePrice" DECIMAL(12,2) DEFAULT 0,
    "pricePerPerson" DECIMAL(12,2) DEFAULT 0,
    "minGuests" INTEGER DEFAULT 0,
    "maxGuests" INTEGER DEFAULT 0,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "MenuDish" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "course" TEXT DEFAULT '',
    "sortOrder" INTEGER DEFAULT 0,
    "isOptional" BOOLEAN DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MenuDish_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recipientEmployeeId" TEXT NOT NULL,
    "notificationType" TEXT DEFAULT '',
    "title" TEXT DEFAULT '',
    "body" TEXT DEFAULT '',
    "actionUrl" TEXT DEFAULT '',
    "isRead" BOOLEAN DEFAULT false,
    "readAt" TIMESTAMP(3),
    "correlationId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "OverrideAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT DEFAULT '',
    "entityId" TEXT DEFAULT '',
    "constraintId" TEXT DEFAULT '',
    "guardExpression" TEXT DEFAULT '',
    "overriddenBy" TEXT DEFAULT '',
    "overrideReason" TEXT DEFAULT '',
    "authorizedBy" TEXT DEFAULT '',
    "authorizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "OverrideAudit_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL DEFAULT '',
    "externalMethodId" TEXT DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'CREDIT_CARD',
    "cardLastFour" TEXT DEFAULT '',
    "cardNetwork" TEXT DEFAULT '',
    "cardExpiryMonth" INTEGER DEFAULT 0,
    "cardExpiryYear" INTEGER DEFAULT 0,
    "cardHolderName" TEXT DEFAULT '',
    "bankAccountLastFour" TEXT DEFAULT '',
    "bankAccountType" TEXT DEFAULT '',
    "bankRoutingNumber" TEXT DEFAULT '',
    "walletProvider" TEXT DEFAULT '',
    "walletEmail" TEXT DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "fraudFlagged" BOOLEAN DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationMethod" TEXT DEFAULT '',
    "nickname" TEXT DEFAULT '',
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "methodType" TEXT NOT NULL DEFAULT 'CREDIT_CARD',
    "invoiceId" TEXT NOT NULL DEFAULT '',
    "eventId" TEXT NOT NULL DEFAULT '',
    "clientId" TEXT NOT NULL DEFAULT '',
    "gatewayTransactionId" TEXT DEFAULT '',
    "gatewayPaymentMethodId" TEXT DEFAULT '',
    "processor" TEXT DEFAULT '',
    "processorResponseCode" TEXT DEFAULT '',
    "processorResponseMessage" TEXT DEFAULT '',
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "chargebackAt" TIMESTAMP(3),
    "fraudStatus" TEXT DEFAULT 'NOT_CHECKED',
    "fraudScore" DOUBLE PRECISION DEFAULT 0,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "externalReference" TEXT DEFAULT '',
    "metadata" TEXT DEFAULT '{}',

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TEXT DEFAULT '',
    "periodEnd" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'open',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EmployeeDeduction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT DEFAULT '',
    "type" TEXT DEFAULT '',
    "name" TEXT DEFAULT '',
    "amount" DECIMAL(12,2) DEFAULT 0,
    "percentage" DECIMAL(12,2) DEFAULT 0,
    "isPreTax" BOOLEAN DEFAULT false,
    "effectiveDate" TEXT DEFAULT '',
    "endDate" TEXT DEFAULT '',
    "maxAnnualAmount" DECIMAL(12,2) DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmployeeDeduction_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PayrollApprovalHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollRunId" TEXT DEFAULT '',
    "action" TEXT DEFAULT '',
    "previousStatus" TEXT DEFAULT '',
    "newStatus" TEXT DEFAULT '',
    "performedBy" TEXT DEFAULT '',
    "performedAt" TIMESTAMP(3),
    "reason" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "PayrollApprovalHistory_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollPeriodId" TEXT DEFAULT '',
    "runDate" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "totalGross" DECIMAL(12,2) DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) DEFAULT 0,
    "totalNet" DECIMAL(12,2) DEFAULT 0,
    "approvedBy" TEXT DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectReason" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PrepComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "commentText" TEXT NOT NULL,
    "isResolved" BOOLEAN DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PrepComment_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PrepList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "batchMultiplier" DECIMAL(12,2) DEFAULT 1,
    "dietaryRestrictions" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'draft',
    "totalItems" INTEGER DEFAULT 0,
    "totalEstimatedTime" DECIMAL(12,2) DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "generatedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "isActive" BOOLEAN DEFAULT true,

    CONSTRAINT "PrepList_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PrepListItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prepListId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "stationName" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "category" TEXT DEFAULT '',
    "baseQuantity" INTEGER DEFAULT 0,
    "baseUnit" TEXT DEFAULT '',
    "scaledQuantity" INTEGER DEFAULT 0,
    "scaledUnit" TEXT DEFAULT '',
    "isOptional" BOOLEAN DEFAULT false,
    "preparationNotes" TEXT DEFAULT '',
    "allergens" TEXT DEFAULT '',
    "dietarySubstitutions" TEXT DEFAULT '',
    "dishId" TEXT DEFAULT '',
    "dishName" TEXT DEFAULT '',
    "recipeVersionId" TEXT DEFAULT '',
    "sortOrder" INTEGER DEFAULT 0,
    "isCompleted" BOOLEAN DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT DEFAULT '',

    CONSTRAINT "PrepListItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PrepMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "estimatedDurationMinutes" DECIMAL(12,2) DEFAULT 0,
    "requiresCertification" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PrepMethod_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PrepTaskPlanWorkflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT DEFAULT '',
    "idempotencyKey" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'created',
    "currentStep" INTEGER DEFAULT 0,
    "totalSteps" INTEGER DEFAULT 5,
    "generationOptions" TEXT DEFAULT '{}',
    "generatedTasks" TEXT DEFAULT '[]',
    "reviewedTasks" TEXT DEFAULT '[]',
    "approvedTaskIds" TEXT DEFAULT '[]',
    "rejectedTaskIds" TEXT DEFAULT '[]',
    "instantiatedTaskIds" TEXT DEFAULT '[]',
    "scheduledWindows" TEXT DEFAULT '{}',
    "constraintOutcomes" TEXT DEFAULT '[]',
    "errors" TEXT DEFAULT '[]',
    "warnings" TEXT DEFAULT '[]',
    "generatedCount" DECIMAL(12,2) DEFAULT 0,
    "approvedCount" INTEGER DEFAULT 0,
    "instantiatedCount" INTEGER DEFAULT 0,
    "reviewedBy" TEXT DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PrepTaskPlanWorkflow_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PrepTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "prepListId" TEXT DEFAULT '',
    "name" TEXT NOT NULL,
    "taskType" TEXT NOT NULL DEFAULT 'prep',
    "status" TEXT NOT NULL DEFAULT 'open',
    "stationId" TEXT DEFAULT '',
    "claimedBy" TEXT DEFAULT '',
    "claimedAt" TIMESTAMP(3),
    "quantityTotal" INTEGER DEFAULT 0,
    "quantityCompleted" INTEGER DEFAULT 0,
    "quantityUnitId" TEXT DEFAULT '',
    "servingsTotal" INTEGER DEFAULT 0,
    "startByDate" TIMESTAMP(3),
    "dueByDate" TIMESTAMP(3),
    "priority" INTEGER DEFAULT 5,
    "notes" TEXT DEFAULT '',
    "ingredients" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PrepTask_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "catalogEntryId" TEXT NOT NULL,
    "tierName" TEXT DEFAULT '',
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(12,2) DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PurchaseRequisition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requisitionNumber" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "requestDate" TIMESTAMP(3) NOT NULL,
    "requiredBy" TIMESTAMP(3),
    "locationId" TEXT DEFAULT '',
    "department" TEXT DEFAULT '',
    "justification" TEXT DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimatedTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimatedShipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimatedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approvedBy" TEXT DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "managerApprovalBy" TEXT DEFAULT '',
    "managerApprovalAt" TIMESTAMP(3),
    "financeApprovalBy" TEXT DEFAULT '',
    "financeApprovalAt" TIMESTAMP(3),
    "convertedToPoId" TEXT DEFAULT '',
    "convertedAt" TIMESTAMP(3),
    "rejectionReason" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "itemCategory" TEXT DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "itemCount" INTEGER DEFAULT 0,

    CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PurchaseRequisitionItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT DEFAULT '',
    "quantityRequested" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitId" INTEGER DEFAULT 0,
    "estimatedUnitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimatedTotalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "suggestedVendorId" TEXT DEFAULT '',
    "suggestedVendorName" TEXT DEFAULT '',
    "specifications" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseRequisitionItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalNumber" TEXT DEFAULT '',
    "clientId" TEXT DEFAULT '',
    "leadId" TEXT DEFAULT '',
    "eventId" TEXT DEFAULT '',
    "title" TEXT DEFAULT '',
    "eventDate" TIMESTAMP(3),
    "eventType" TEXT DEFAULT '',
    "guestCount" INTEGER DEFAULT 0,
    "venueName" TEXT DEFAULT '',
    "venueAddress" TEXT DEFAULT '',
    "subtotal" DECIMAL(12,2) DEFAULT 0,
    "taxRate" DECIMAL(12,2) DEFAULT 0,
    "taxAmount" DECIMAL(12,2) DEFAULT 0,
    "discountAmount" DECIMAL(12,2) DEFAULT 0,
    "total" DECIMAL(12,2) DEFAULT 0,
    "status" TEXT DEFAULT 'draft',
    "validUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "termsAndConditions" TEXT DEFAULT '',
    "lineItemCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ProposalLineItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "itemType" TEXT DEFAULT '',
    "category" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "quantity" INTEGER DEFAULT 0,
    "unitOfMeasure" TEXT DEFAULT '',
    "unitPrice" DECIMAL(12,2) DEFAULT 0,
    "total" DECIMAL(12,2) DEFAULT 0,
    "totalPrice" DECIMAL(12,2) DEFAULT 0,
    "sortOrder" INTEGER DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProposalLineItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "submittedBy" TEXT DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "receivedBy" TEXT DEFAULT '',
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "itemCount" INTEGER DEFAULT 0,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityOrdered" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quantityReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitId" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "qualityStatus" TEXT DEFAULT 'pending',
    "discrepancyType" TEXT DEFAULT '',
    "discrepancyAmount" DECIMAL(12,2) DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "QACheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "location" TEXT DEFAULT '',
    "checkType" TEXT NOT NULL,
    "result" TEXT DEFAULT 'pass',
    "inspector" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "QACheck_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "QACorrectiveAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT DEFAULT '',
    "priority" TEXT DEFAULT 'medium',
    "status" TEXT DEFAULT 'open',
    "resolutionNotes" TEXT DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "QACorrectiveAction_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "QATemperatureLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "temperature" DECIMAL(12,2) NOT NULL,
    "unit" TEXT DEFAULT 'fahrenheit',
    "equipment" TEXT DEFAULT '',
    "recordedBy" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "loggedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "QATemperatureLog_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "RateLimitConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "endpointPattern" TEXT NOT NULL DEFAULT '',
    "windowMs" INTEGER NOT NULL DEFAULT 60000,
    "maxRequests" INTEGER NOT NULL DEFAULT 100,
    "burstAllowance" INTEGER DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RateLimitConfig_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT DEFAULT '',
    "cuisineType" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "RecipeVersion" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "category" TEXT DEFAULT '',
    "cuisineType" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "yieldQuantity" INTEGER DEFAULT 1,
    "yieldUnitId" INTEGER DEFAULT 1,
    "yieldDescription" TEXT DEFAULT '',
    "prepTimeMinutes" INTEGER DEFAULT 0,
    "cookTimeMinutes" INTEGER DEFAULT 0,
    "restTimeMinutes" INTEGER DEFAULT 0,
    "difficultyLevel" INTEGER DEFAULT 1,
    "instructions" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "ingredientCount" INTEGER DEFAULT 0,
    "stepCount" INTEGER DEFAULT 0,
    "totalCost" DECIMAL(12,2) DEFAULT 0,
    "costPerYield" DECIMAL(12,2) DEFAULT 0,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "RecipeVersion_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "preparationNotes" TEXT DEFAULT '',
    "isOptional" BOOLEAN DEFAULT false,
    "wasteFactor" DECIMAL(12,2) DEFAULT 1,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "RecipeStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "durationMinutes" DECIMAL(12,2) DEFAULT 0,
    "temperatureValue" DECIMAL(12,2) DEFAULT 0,
    "temperatureUnit" TEXT DEFAULT '',
    "equipmentNeeded" TEXT DEFAULT '',
    "tips" TEXT DEFAULT '',
    "videoUrl" TEXT DEFAULT '',
    "imageUrl" TEXT DEFAULT '',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecipeStep_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "RevenueRecognitionSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "recognizedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "recognitionPeriod" INTEGER DEFAULT 0,
    "serviceStartDate" TIMESTAMP(3),
    "serviceEndDate" TIMESTAMP(3),
    "totalMilestones" INTEGER DEFAULT 0,
    "completedMilestones" INTEGER DEFAULT 0,
    "description" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "metadata" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RevenueRecognitionSchedule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "RevenueRecognitionLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "recognizedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "recognizedAt" TIMESTAMP(3),
    "milestoneId" TEXT DEFAULT '',
    "milestoneName" TEXT DEFAULT '',
    "milestoneDescription" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "metadata" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueRecognitionLine_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "RolePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "roleName" TEXT DEFAULT '',
    "permissions" TEXT DEFAULT '[]',
    "description" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RolePolicy_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "SampleData" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seededAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "isSeeded" BOOLEAN DEFAULT false,
    "eventsCreated" INTEGER DEFAULT 0,
    "clientsCreated" INTEGER DEFAULT 0,
    "usersCreated" INTEGER DEFAULT 0,
    "recipesCreated" INTEGER DEFAULT 0,

    CONSTRAINT "SampleData_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT DEFAULT '',
    "scheduleDate" TIMESTAMP(3),
    "status" TEXT DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "shiftCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ScheduleShift" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "shiftStart" TIMESTAMP(3),
    "shiftEnd" TIMESTAMP(3),
    "roleDuringShift" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduleShift_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "status" TEXT DEFAULT 'draft',
    "purchaseOrderId" TEXT DEFAULT '',
    "eventId" TEXT DEFAULT '',
    "supplierId" TEXT DEFAULT '',
    "locationId" TEXT DEFAULT '',
    "scheduledDate" TIMESTAMP(3),
    "shippedDate" TIMESTAMP(3),
    "estimatedDeliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "totalItems" INTEGER DEFAULT 0,
    "shippingCost" DECIMAL(12,2) DEFAULT 0,
    "totalValue" DECIMAL(12,2) DEFAULT 0,
    "trackingNumber" TEXT DEFAULT '',
    "carrier" TEXT DEFAULT '',
    "shippingMethod" TEXT DEFAULT '',
    "deliveredBy" TEXT DEFAULT '',
    "receivedBy" TEXT DEFAULT '',
    "signature" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "internalNotes" TEXT DEFAULT '',
    "reference" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityShipped" INTEGER DEFAULT 0,
    "quantityReceived" INTEGER DEFAULT 0,
    "quantityDamaged" INTEGER DEFAULT 0,
    "unitId" INTEGER DEFAULT 0,
    "unitCost" DECIMAL(12,2) DEFAULT 0,
    "totalCost" DECIMAL(12,2) DEFAULT 0,
    "condition" TEXT DEFAULT 'good',
    "conditionNotes" TEXT DEFAULT '',
    "lotNumber" TEXT DEFAULT '',
    "expirationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "SmsAutomationRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT DEFAULT '',
    "triggerType" TEXT NOT NULL DEFAULT 'custom_event',
    "triggerConfig" TEXT DEFAULT '{}',
    "templateId" TEXT DEFAULT '',
    "customMessage" TEXT DEFAULT '',
    "recipientType" TEXT DEFAULT 'employee',
    "recipientConfig" TEXT DEFAULT '{}',
    "isActive" BOOLEAN DEFAULT true,
    "priority" INTEGER DEFAULT 100,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SmsAutomationRule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TimecardApproval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "approvedBy" TEXT DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TimecardApproval_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PayrollLineItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "grossPay" DECIMAL(12,2) DEFAULT 0,
    "netPay" DECIMAL(12,2) DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) DEFAULT 0,
    "hoursWorked" DECIMAL(12,2) DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PayrollLineItem_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TipPool" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "eventId" TEXT DEFAULT '',
    "totalTips" DECIMAL(12,2) DEFAULT 0,
    "status" TEXT DEFAULT 'open',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TipPool_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "DisciplinaryAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "actionType" TEXT DEFAULT '',
    "reason" TEXT DEFAULT '',
    "severity" TEXT DEFAULT 'low',
    "status" TEXT DEFAULT 'open',
    "issuedBy" TEXT DEFAULT '',
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "DisciplinaryAction_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "ActionMilestone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "disciplinaryActionId" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "dueAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ActionMilestone_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewPeriod" TEXT DEFAULT '',
    "overallRating" DECIMAL(12,2) DEFAULT 0,
    "status" TEXT DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TrainingCompletion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "trainingModuleId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" DECIMAL(12,2) DEFAULT 0,
    "passed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingCompletion_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "sortOrder" INTEGER DEFAULT 0,
    "isRequired" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "OnboardingCompletion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "onboardingTaskId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingCompletion_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "OpenShift" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "role" TEXT DEFAULT '',
    "shiftStart" TIMESTAMP(3),
    "shiftEnd" TIMESTAMP(3),
    "status" TEXT DEFAULT 'open',
    "claimedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "OpenShift_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "DeliveryRoute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "driverId" TEXT DEFAULT '',
    "routeDate" TIMESTAMP(3),
    "status" TEXT DEFAULT 'planned',
    "totalStops" INTEGER DEFAULT 0,
    "distanceMiles" DECIMAL(12,2) DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryRoute_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryRouteId" TEXT NOT NULL,
    "eventId" TEXT DEFAULT '',
    "address" TEXT DEFAULT '',
    "sequence" INTEGER DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',
    "arrivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PaymentRefundAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) DEFAULT 0,
    "reason" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "attemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentRefundAttempt_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PreventiveMaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "frequency" TEXT DEFAULT '',
    "nextDueAt" TIMESTAMP(3),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PreventiveMaintenanceSchedule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Unnamed',
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "role" TEXT DEFAULT 'server',
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "StaffPerformance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewType" TEXT DEFAULT 'quarterly',
    "status" TEXT DEFAULT 'draft',
    "rating" DECIMAL(12,2) DEFAULT 0,
    "reviewerId" TEXT DEFAULT '',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "strengths" TEXT DEFAULT '',
    "improvements" TEXT DEFAULT '',
    "goals" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "StaffPerformance_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stationType" TEXT NOT NULL DEFAULT 'prep-station',
    "capacitySimultaneousTasks" INTEGER DEFAULT 1,
    "equipmentList" TEXT DEFAULT '',
    "isActive" BOOLEAN DEFAULT true,
    "currentTaskCount" INTEGER DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Station_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "locationId" TEXT DEFAULT '',
    "shiftId" TEXT DEFAULT '',
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "breakMinutes" INTEGER DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "approvedBy" TEXT DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TimecardEditRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "requestedClockIn" TIMESTAMP(3),
    "requestedClockOut" TIMESTAMP(3),
    "requestedBreakMinutes" INTEGER DEFAULT 0,
    "reason" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TimecardEditRequest_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TimeOffRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT DEFAULT '',
    "startDate" TEXT DEFAULT '',
    "endDate" TEXT DEFAULT '',
    "reason" TEXT DEFAULT '',
    "requestType" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'PENDING',
    "processedBy" TEXT DEFAULT '',
    "processedAt" TIMESTAMP(3),
    "rejectionReason" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TrainingAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleId" TEXT DEFAULT '',
    "employeeId" TEXT DEFAULT '',
    "assignedToAll" BOOLEAN DEFAULT false,
    "assignedBy" TEXT DEFAULT '',
    "dueDate" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'assigned',
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "TrainingModule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "contentUrl" TEXT DEFAULT '',
    "contentType" TEXT DEFAULT 'document',
    "durationMinutes" INTEGER DEFAULT 0,
    "category" TEXT DEFAULT '',
    "isRequired" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'staff',
    "authUserId" TEXT DEFAULT '',
    "employeeNumber" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "employmentType" TEXT DEFAULT 'full_time',
    "hourlyRate" DECIMAL(12,2) DEFAULT 0,
    "salaryAnnual" DECIMAL(12,2) DEFAULT 0,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT DEFAULT '',
    "roleId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "VendorCatalog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL DEFAULT '',
    "itemName" TEXT NOT NULL DEFAULT '',
    "description" TEXT DEFAULT '',
    "category" TEXT DEFAULT '',
    "baseUnitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'each',
    "leadTimeDays" INTEGER DEFAULT 0,
    "leadTimeMinDays" INTEGER DEFAULT 0,
    "leadTimeMaxDays" INTEGER DEFAULT 0,
    "minimumOrderQuantity" INTEGER DEFAULT 0,
    "orderMultiple" INTEGER DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "supplierSku" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "tags" TEXT[],
    "lastCostUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VendorCatalog_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "VendorContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT DEFAULT '',
    "contractType" TEXT DEFAULT 'purchase',
    "status" TEXT DEFAULT 'draft',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN DEFAULT false,
    "renewalTermDays" INTEGER DEFAULT 0,
    "noticeDaysBeforeRenewal" INTEGER DEFAULT 30,
    "paymentTerms" TEXT DEFAULT 'NET_30',
    "deliveryTerms" TEXT DEFAULT '',
    "minimumOrderQuantity" INTEGER DEFAULT 0,
    "annualSpendCommitment" DECIMAL(12,2) DEFAULT 0,
    "spendToPeriod" DECIMAL(12,2) DEFAULT 0,
    "currencyCode" TEXT DEFAULT 'USD',
    "approvedBy" TEXT DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "terminatedBy" TEXT DEFAULT '',
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT DEFAULT '',
    "contractUrl" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "complianceScore" DECIMAL(12,2) DEFAULT 100,
    "lastComplianceReview" DECIMAL(12,2) DEFAULT 0,
    "slaBreachCount" INTEGER DEFAULT 0,
    "onTimeDeliveryRate" DECIMAL(12,2) DEFAULT 0,
    "qualityRating" DECIMAL(12,2) DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VendorContract_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT DEFAULT 'supplier',
    "status" TEXT DEFAULT 'active',
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "website" TEXT DEFAULT '',
    "address" TEXT DEFAULT '',
    "city" TEXT DEFAULT '',
    "state" TEXT DEFAULT '',
    "zip" TEXT DEFAULT '',
    "taxId" TEXT DEFAULT '',
    "paymentTerms" TEXT DEFAULT 'net30',
    "rating" DECIMAL(12,2) DEFAULT 0,
    "ratingCount" INTEGER DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "VersionedEntity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "isLocked" BOOLEAN DEFAULT false,
    "currentVersionId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "VersionedEntity_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EntityVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versionedEntityId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeReason" TEXT DEFAULT '',
    "changeSummary" TEXT DEFAULT '',
    "changeType" TEXT NOT NULL,
    "snapshotData" TEXT,
    "metadata" TEXT,
    "isApproved" BOOLEAN DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "createdBy" TEXT DEFAULT '',

    CONSTRAINT "EntityVersion_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "VersionApproval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityVersionId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comments" TEXT DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "VersionApproval_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "WasteEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT DEFAULT '',
    "reasonId" INTEGER DEFAULT 0,
    "quantity" INTEGER DEFAULT 0,
    "unitId" INTEGER DEFAULT 0,
    "locationId" TEXT DEFAULT '',
    "eventId" TEXT DEFAULT '',
    "loggedBy" TEXT DEFAULT '',
    "loggedAt" TIMESTAMP(3),
    "unitCost" DECIMAL(12,2) DEFAULT 0,
    "totalCost" DECIMAL(12,2) DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WasteEntry_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "equipmentName" TEXT DEFAULT '',
    "title" TEXT NOT NULL,
    "type" TEXT DEFAULT 'repair',
    "priority" TEXT DEFAULT 'medium',
    "status" TEXT DEFAULT 'open',
    "description" TEXT DEFAULT '',
    "scheduledDate" TIMESTAMP(3),
    "assignedTo" TEXT DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "triggerType" TEXT DEFAULT '',
    "triggerConfig" TEXT DEFAULT '{}',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "WorkforceOptimization" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT DEFAULT '',
    "optimizationType" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkforceOptimization_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PerformancePrediction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT DEFAULT '',
    "predictionType" TEXT DEFAULT '',
    "predictionHorizon" INTEGER DEFAULT 0,
    "predictionScore" DECIMAL(12,2) DEFAULT 0,
    "confidence" TEXT DEFAULT 'medium',
    "factors" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PerformancePrediction_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "manifest_command_telemetry" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "command_name" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "instance_id" UUID,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "error_code" TEXT,
    "duration_ms" INTEGER,
    "guard_eval_ms" INTEGER,
    "action_exec_ms" INTEGER,
    "guards_evaluated" INTEGER DEFAULT 0,
    "guards_passed" INTEGER DEFAULT 0,
    "guards_failed" INTEGER DEFAULT 0,
    "failed_guards" JSONB,
    "idempotency_key" TEXT,
    "was_idempotent_hit" BOOLEAN NOT NULL DEFAULT false,
    "events_emitted" INTEGER DEFAULT 0,
    "performed_by" UUID,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "request_id" TEXT,
    "ip_address" TEXT,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifest_command_telemetry_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "manifest_entity" (
    "tenant_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "id" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifest_entity_pkey" PRIMARY KEY ("tenant_id","entity_type","id")
);

-- CreateTable
CREATE TABLE "manifest_idempotency" (
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "manifest_idempotency_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_webhooks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "secret" TEXT,
    "api_key" TEXT,
    "event_type_filters" "webhook_event_type"[] DEFAULT ARRAY[]::"webhook_event_type"[],
    "entity_filters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "webhook_status" NOT NULL DEFAULT 'active',
    "retry_count" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_ms" INTEGER NOT NULL DEFAULT 1000,
    "timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "custom_headers" JSONB,
    "last_triggered_at" TIMESTAMPTZ(6),
    "last_success_at" TIMESTAMPTZ(6),
    "last_failure_at" TIMESTAMPTZ(6),
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "outbound_webhooks_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "webhook_delivery_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID NOT NULL,
    "eventType" "webhook_event_type" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "webhook_delivery_status" NOT NULL DEFAULT 'pending',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "http_response_status" INTEGER,
    "response_body" TEXT,
    "error_message" TEXT,
    "next_retry_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_delivery_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "webhook_dead_letter_queue" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID,
    "original_delivery_id" UUID NOT NULL,
    "eventType" "webhook_event_type" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "final_error_message" TEXT,
    "total_attempts" INTEGER NOT NULL DEFAULT 1,
    "original_url" VARCHAR(2048) NOT NULL,
    "moved_to_dlq_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "retried_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_dead_letter_queue_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "goodshuffle_config" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_key" TEXT NOT NULL,
    "api_secret" TEXT NOT NULL,
    "webhook_secret" TEXT,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "syncDirection" TEXT NOT NULL DEFAULT 'one_way',
    "conflictResolution" TEXT NOT NULL DEFAULT 'convoy_wins',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "auto_sync_interval" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goodshuffle_config_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "goodshuffle_event_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goodshuffle_event_id" TEXT NOT NULL,
    "convoy_event_id" UUID,
    "event_name" TEXT,
    "event_date" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sync_error" TEXT,
    "conflict_data" JSONB,
    "conflict_resolved_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6),
    "goodshuffle_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goodshuffle_event_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "goodshuffle_inventory_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goodshuffle_item_id" TEXT NOT NULL,
    "convoy_inventory_item_id" UUID,
    "item_name" TEXT,
    "item_sku" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sync_error" TEXT,
    "conflict_data" JSONB,
    "conflict_resolved_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6),
    "goodshuffle_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goodshuffle_inventory_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "goodshuffle_invoice_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goodshuffle_invoice_id" TEXT NOT NULL,
    "convoy_invoice_id" UUID,
    "invoice_number" TEXT,
    "invoice_total" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sync_error" TEXT,
    "conflict_data" JSONB,
    "conflict_resolved_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6),
    "goodshuffle_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goodshuffle_invoice_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "nowsta_config" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_key" TEXT NOT NULL,
    "api_secret" TEXT NOT NULL,
    "organization_id" TEXT,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "syncDirection" TEXT NOT NULL DEFAULT 'one_way',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "auto_sync_interval" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nowsta_config_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "nowsta_employee_mappings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nowsta_employee_id" TEXT NOT NULL,
    "convoy_employee_id" UUID NOT NULL,
    "nowsta_employee_name" TEXT,
    "nowsta_employee_email" TEXT,
    "auto_mapped" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nowsta_employee_mappings_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "nowsta_shift_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nowsta_shift_id" TEXT NOT NULL,
    "convoy_shift_id" UUID,
    "nowsta_employee_id" TEXT NOT NULL,
    "location_id" UUID,
    "shift_start" TIMESTAMPTZ(6) NOT NULL,
    "shift_end" TIMESTAMPTZ(6) NOT NULL,
    "role_during_shift" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sync_error" TEXT,
    "last_synced_at" TIMESTAMPTZ(6),
    "nowsta_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nowsta_shift_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "provider_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMPTZ(6),
    "calendar_id" TEXT,
    "calendar_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "syncDirection" TEXT NOT NULL DEFAULT 'import',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "provider_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "supplier_sync_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "products_synced" INTEGER NOT NULL DEFAULT 0,
    "products_created" INTEGER NOT NULL DEFAULT 0,
    "products_updated" INTEGER NOT NULL DEFAULT 0,
    "products_deactivated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "triggered_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "supplier_sync_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "table_schema" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "action" "action_type" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "performed_by" UUID,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id","created_at")
);

-- CreateTable
CREATE TABLE "audit_archive" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "table_schema" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "action" "action_type" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "performed_by" UUID,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_archive_pkey" PRIMARY KEY ("id","created_at")
);

-- CreateTable
CREATE TABLE "audit_config" (
    "table_schema" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "audit_level" TEXT NOT NULL DEFAULT 'full',
    "excluded_columns" TEXT[],

    CONSTRAINT "audit_config_pkey" PRIMARY KEY ("table_schema","table_name")
);

-- CreateTable
CREATE TABLE "admin_audit_trail" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_user_id" UUID NOT NULL,
    "entity_type" "admin_entity_type" NOT NULL,
    "entity_id" UUID,
    "action" "admin_action" NOT NULL,
    "description" TEXT,
    "changes" JSONB,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_audit_trail_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "cycle_count_audit_log" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "record_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "performed_by_id" UUID NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cycle_count_audit_log_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "payroll_audit_log" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" UUID,
    "input_snapshot" JSONB,
    "rules_version" TEXT,
    "result_summary" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_audit_log_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "approval_history" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" UUID NOT NULL,
    "performed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_history_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "ActivityFeed" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "performed_by" UUID,
    "performer_name" TEXT,
    "correlation_id" UUID,
    "parent_id" UUID,
    "source_type" TEXT,
    "source_id" UUID,
    "importance" TEXT NOT NULL DEFAULT 'normal',
    "visibility" TEXT NOT NULL DEFAULT 'all',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityFeed_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "employee_pin_access_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "accessed_by_id" UUID NOT NULL,
    "access_type" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pin_access_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID,
    "recipient_email" TEXT NOT NULL,
    "recipient_id" UUID,
    "recipient_type" TEXT,
    "subject" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "status" "email_status" NOT NULL DEFAULT 'pending',
    "resend_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "opened_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID,
    "phone_number" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "status" "sms_status" NOT NULL DEFAULT 'pending',
    "twilio_sid" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sent_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "correlation_id" TEXT,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_history" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "schedule_id" UUID,
    "generated_by" UUID,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "output_format" TEXT NOT NULL,
    "file_url" TEXT,
    "file_size_bytes" BIGINT,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_history_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sentry_fix_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sentry_issue_id" TEXT NOT NULL,
    "sentry_event_id" TEXT,
    "organization_slug" TEXT NOT NULL,
    "project_slug" TEXT NOT NULL,
    "environment" TEXT,
    "release" TEXT,
    "issue_title" TEXT NOT NULL,
    "issue_url" TEXT NOT NULL,
    "status" "SentryFixJobStatus" NOT NULL DEFAULT 'queued',
    "payload_snapshot" JSONB NOT NULL,
    "branch_name" TEXT,
    "pr_url" TEXT,
    "pr_number" INTEGER,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentry_fix_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_events" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "window_end" TIMESTAMPTZ(6) NOT NULL,
    "requests_in_window" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "user_id" UUID,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "response_time" INTEGER,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "rate_limit_usage" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "bucket_start" TIMESTAMPTZ(6) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "blocked_count" INTEGER NOT NULL DEFAULT 0,
    "avg_response_time" INTEGER,
    "max_response_time" INTEGER,
    "user_hashes" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_usage_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "settings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "setting_key" TEXT NOT NULL,
    "setting_value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "waste_reasons" (
    "id" SMALLSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color_hex" CHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "waste_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_types" (
    "id" SMALLINT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color_hex" CHAR(7),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "status_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_transitions" (
    "id" BIGSERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "from_status_code" TEXT,
    "to_status_code" TEXT NOT NULL,
    "requires_role" TEXT[],
    "is_automatic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "status_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SMALLINT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_plural" TEXT NOT NULL,
    "unit_system" "unit_system" NOT NULL,
    "unit_type" "unit_type" NOT NULL,
    "is_base_unit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_conversions" (
    "from_unit_id" SMALLINT NOT NULL,
    "to_unit_id" SMALLINT NOT NULL,
    "multiplier" DECIMAL(20,10) NOT NULL,

    CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("from_unit_id","to_unit_id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "triggered_by" UUID,
    "trigger_data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'running',
    "current_step_id" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "execution_log" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "step_number" SMALLINT NOT NULL,
    "step_type" TEXT NOT NULL,
    "step_config" JSONB NOT NULL DEFAULT '{}',
    "on_success_step_id" UUID,
    "on_failure_step_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sms_automation_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_type" "sms_automation_trigger_type" NOT NULL,
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "template_id" UUID,
    "custom_message" TEXT,
    "recipient_type" "sms_recipient_type" NOT NULL DEFAULT 'employee',
    "recipient_config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sms_automation_rules_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "schedule_cron" TEXT NOT NULL,
    "output_format" TEXT NOT NULL DEFAULT 'pdf',
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMPTZ(6),
    "next_run_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "notification_type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "default_timezone" TEXT NOT NULL DEFAULT 'UTC',
    "week_start" SMALLINT NOT NULL DEFAULT 1,
    "subscription_tier" TEXT NOT NULL DEFAULT 'trial',
    "subscription_status" TEXT NOT NULL DEFAULT 'active',
    "max_locations" SMALLINT NOT NULL DEFAULT 1,
    "max_employees" SMALLINT NOT NULL DEFAULT 10,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country_code" CHAR(2),
    "timezone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "roles" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "base_rate" DECIMAL(10,2) NOT NULL,
    "overtime_multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.5,
    "overtime_threshold_hours" SMALLINT NOT NULL DEFAULT 40,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "departments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tax_configurations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tax_type" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "state_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tax_configurations_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "employee_bank_accounts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_type" TEXT NOT NULL DEFAULT 'checking',
    "routing_number" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_number_last4" TEXT,
    "account_holder_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ(6),
    "verification_method" TEXT,
    "deposit_history" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_bank_accounts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "employee_payroll_prefs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "pay_period_frequency" TEXT NOT NULL DEFAULT 'biweekly',
    "rounding_rule" TEXT NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_payroll_prefs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "employee_tax_info" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'FL',
    "filing_status" TEXT NOT NULL DEFAULT 'single',
    "federal_withholding_allowances" INTEGER NOT NULL DEFAULT 0,
    "state_withholding_allowances" INTEGER NOT NULL DEFAULT 0,
    "additional_withholding" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_tax_info_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "employee_pins" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "pin_encrypted" TEXT NOT NULL,
    "pin_hint" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_pins_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "employee_locations" (
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_locations_pkey" PRIMARY KEY ("tenant_id","employee_id","location_id")
);

-- CreateTable
CREATE TABLE "employee_seniority" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_seniority_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "employee_skills" (
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "proficiency_level" SMALLINT NOT NULL DEFAULT 1,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("tenant_id","employee_id","skill_id")
);

-- CreateTable
CREATE TABLE "skills" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "skills_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "preference_key" TEXT NOT NULL,
    "preference_value" JSONB NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMPTZ(6),
    "last_failed_login" TIMESTAMPTZ(6),
    "failed_login_attempts" SMALLINT DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "login_ip" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_name" "admin_role" NOT NULL,
    "description" TEXT,
    "permissions" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "permission_name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_command_name_executed__idx" ON "manifest_command_telemetry"("tenant_id", "command_name", "executed_at");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_entity_name_executed_a_idx" ON "manifest_command_telemetry"("tenant_id", "entity_name", "executed_at");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_status_executed_at_idx" ON "manifest_command_telemetry"("tenant_id", "status", "executed_at");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_performed_by_executed__idx" ON "manifest_command_telemetry"("tenant_id", "performed_by", "executed_at");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_correlation_id_idx" ON "manifest_command_telemetry"("tenant_id", "correlation_id");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_executed_at_idx" ON "manifest_command_telemetry"("executed_at");

-- CreateIndex
CREATE INDEX "manifest_entity_tenant_id_entity_type_idx" ON "manifest_entity"("tenant_id", "entity_type");

-- CreateIndex
CREATE INDEX "manifest_idempotency_expires_at_idx" ON "manifest_idempotency"("expires_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_created_at_idx" ON "OutboxEvent"("status", "created_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenant_id_idx" ON "OutboxEvent"("tenant_id");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregate_type_aggregate_id_idx" ON "OutboxEvent"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "outbound_webhooks_tenant_id_status_idx" ON "outbound_webhooks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "outbound_webhooks_tenant_id_created_at_idx" ON "outbound_webhooks"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_webhook_id_idx" ON "webhook_delivery_logs"("tenant_id", "webhook_id");

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_status_idx" ON "webhook_delivery_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_entity_type_entity_id_idx" ON "webhook_delivery_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_created_at_idx" ON "webhook_delivery_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_next_retry_at_idx" ON "webhook_delivery_logs"("tenant_id", "next_retry_at");

-- CreateIndex
CREATE INDEX "webhook_dead_letter_queue_tenant_id_webhook_id_idx" ON "webhook_dead_letter_queue"("tenant_id", "webhook_id");

-- CreateIndex
CREATE INDEX "webhook_dead_letter_queue_tenant_id_entity_type_entity_id_idx" ON "webhook_dead_letter_queue"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "webhook_dead_letter_queue_tenant_id_moved_to_dlq_at_idx" ON "webhook_dead_letter_queue"("tenant_id", "moved_to_dlq_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_dead_letter_queue_tenant_id_reviewed_at_idx" ON "webhook_dead_letter_queue"("tenant_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "goodshuffle_event_syncs_tenant_id_status_idx" ON "goodshuffle_event_syncs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "goodshuffle_event_syncs_tenant_id_event_date_idx" ON "goodshuffle_event_syncs"("tenant_id", "event_date");

-- CreateIndex
CREATE INDEX "goodshuffle_event_syncs_tenant_id_convoy_event_id_idx" ON "goodshuffle_event_syncs"("tenant_id", "convoy_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "goodshuffle_event_syncs_tenant_id_goodshuffle_event_id_key" ON "goodshuffle_event_syncs"("tenant_id", "goodshuffle_event_id");

-- CreateIndex
CREATE INDEX "goodshuffle_inventory_syncs_tenant_id_status_idx" ON "goodshuffle_inventory_syncs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "goodshuffle_inventory_syncs_tenant_id_convoy_inventory_item_idx" ON "goodshuffle_inventory_syncs"("tenant_id", "convoy_inventory_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "goodshuffle_inventory_syncs_tenant_id_goodshuffle_item_id_key" ON "goodshuffle_inventory_syncs"("tenant_id", "goodshuffle_item_id");

-- CreateIndex
CREATE INDEX "goodshuffle_invoice_syncs_tenant_id_status_idx" ON "goodshuffle_invoice_syncs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "goodshuffle_invoice_syncs_tenant_id_convoy_invoice_id_idx" ON "goodshuffle_invoice_syncs"("tenant_id", "convoy_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "goodshuffle_invoice_syncs_tenant_id_goodshuffle_invoice_id_key" ON "goodshuffle_invoice_syncs"("tenant_id", "goodshuffle_invoice_id");

-- CreateIndex
CREATE INDEX "nowsta_employee_mappings_tenant_id_convoy_employee_id_idx" ON "nowsta_employee_mappings"("tenant_id", "convoy_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "nowsta_employee_mappings_tenant_id_nowsta_employee_id_key" ON "nowsta_employee_mappings"("tenant_id", "nowsta_employee_id");

-- CreateIndex
CREATE INDEX "nowsta_shift_syncs_tenant_id_status_idx" ON "nowsta_shift_syncs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "nowsta_shift_syncs_tenant_id_shift_start_idx" ON "nowsta_shift_syncs"("tenant_id", "shift_start");

-- CreateIndex
CREATE INDEX "nowsta_shift_syncs_tenant_id_nowsta_employee_id_idx" ON "nowsta_shift_syncs"("tenant_id", "nowsta_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "nowsta_shift_syncs_tenant_id_nowsta_shift_id_key" ON "nowsta_shift_syncs"("tenant_id", "nowsta_shift_id");

-- CreateIndex
CREATE INDEX "provider_syncs_tenant_id_status_idx" ON "provider_syncs"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_syncs_tenant_id_provider_key" ON "provider_syncs"("tenant_id", "provider");

-- CreateIndex
CREATE INDEX "supplier_sync_logs_tenant_supplier_idx" ON "supplier_sync_logs"("tenant_id", "supplier_id");

-- CreateIndex
CREATE INDEX "supplier_sync_logs_connector_idx" ON "supplier_sync_logs"("connector_id");

-- CreateIndex
CREATE INDEX "supplier_sync_logs_status_idx" ON "supplier_sync_logs"("status");

-- CreateIndex
CREATE INDEX "supplier_sync_logs_created_at_idx" ON "supplier_sync_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_table_record_idx" ON "audit_log"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_log_tenant_created_idx" ON "audit_log"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_archive_tenant_idx" ON "audit_archive"("tenant_id");

-- CreateIndex
CREATE INDEX "cycle_count_audit_tenant_session_idx" ON "cycle_count_audit_log"("tenant_id", "session_id");

-- CreateIndex
CREATE INDEX "cycle_count_audit_tenant_performer_idx" ON "cycle_count_audit_log"("tenant_id", "performed_by_id");

-- CreateIndex
CREATE INDEX "cycle_count_audit_tenant_created_idx" ON "cycle_count_audit_log"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payroll_audit_log_tenant_id_period_id_idx" ON "payroll_audit_log"("tenant_id", "period_id");

-- CreateIndex
CREATE INDEX "payroll_audit_log_tenant_id_action_idx" ON "payroll_audit_log"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "payroll_audit_log_tenant_id_created_at_idx" ON "payroll_audit_log"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_audit_log_tenant_id_id_key" ON "payroll_audit_log"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "approval_history_entity_idx" ON "approval_history"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "approval_history_performer_idx" ON "approval_history"("performed_by");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_created_at_idx" ON "ActivityFeed"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_activity_type_created_at_idx" ON "ActivityFeed"("tenant_id", "activity_type", "created_at");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_entity_type_entity_id_idx" ON "ActivityFeed"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_performed_by_created_at_idx" ON "ActivityFeed"("tenant_id", "performed_by", "created_at");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_correlation_id_idx" ON "ActivityFeed"("tenant_id", "correlation_id");

-- CreateIndex
CREATE INDEX "employee_pin_access_logs_employee_idx" ON "employee_pin_access_logs"("employee_id");

-- CreateIndex
CREATE INDEX "employee_pin_access_logs_accessor_idx" ON "employee_pin_access_logs"("accessed_by_id");

-- CreateIndex
CREATE INDEX "employee_pin_access_logs_created_idx" ON "employee_pin_access_logs"("created_at");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_workflow_id_idx" ON "email_logs"("tenant_id", "workflow_id");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_recipient_email_idx" ON "email_logs"("tenant_id", "recipient_email");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_status_idx" ON "email_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_created_at_idx" ON "email_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "sms_logs_tenant_id_status_idx" ON "sms_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sms_logs_tenant_id_employee_id_idx" ON "sms_logs"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "sms_logs_tenant_id_created_at_idx" ON "sms_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "sent_emails_tenant_idx" ON "sent_emails"("tenant_id");

-- CreateIndex
CREATE INDEX "report_history_generated_at_idx" ON "report_history"("tenant_id", "generated_at" DESC);

-- CreateIndex
CREATE INDEX "report_history_tenant_report_idx" ON "report_history"("tenant_id", "report_id");

-- CreateIndex
CREATE INDEX "sentry_fix_jobs_status_created_at_idx" ON "sentry_fix_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "sentry_fix_jobs_sentry_issue_id_created_at_idx" ON "sentry_fix_jobs"("sentry_issue_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sentry_fix_jobs_sentry_issue_id_key" ON "sentry_fix_jobs"("sentry_issue_id");

-- CreateIndex
CREATE INDEX "rate_limit_events_tenant_id_timestamp_idx" ON "rate_limit_events"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "rate_limit_events_tenant_id_endpoint_idx" ON "rate_limit_events"("tenant_id", "endpoint");

-- CreateIndex
CREATE INDEX "rate_limit_events_tenant_id_allowed_idx" ON "rate_limit_events"("tenant_id", "allowed");

-- CreateIndex
CREATE INDEX "rate_limit_events_tenant_id_user_id_idx" ON "rate_limit_events"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "rate_limit_usage_tenant_id_bucket_start_idx" ON "rate_limit_usage"("tenant_id", "bucket_start");

-- CreateIndex
CREATE INDEX "rate_limit_usage_tenant_id_endpoint_idx" ON "rate_limit_usage"("tenant_id", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_usage_tenant_id_endpoint_method_bucket_start_key" ON "rate_limit_usage"("tenant_id", "endpoint", "method", "bucket_start");

-- CreateIndex
CREATE INDEX "settings_tenant_key_idx" ON "settings"("tenant_id", "setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "settings_tenant_id_setting_key_key" ON "settings"("tenant_id", "setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "waste_reasons_code_key" ON "waste_reasons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "status_types_category_code_key" ON "status_types"("category", "code");

-- CreateIndex
CREATE UNIQUE INDEX "status_transitions_category_from_status_code_to_status_code_key" ON "status_transitions"("category", "from_status_code", "to_status_code");

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "units"("code");

-- CreateIndex
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "workflow_executions_workflow_idx" ON "workflow_executions"("tenant_id", "workflow_id");

-- CreateIndex
CREATE INDEX "workflow_steps_workflow_idx" ON "workflow_steps"("tenant_id", "workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflow_number_idx" ON "workflow_steps"("tenant_id", "workflow_id", "step_number");

-- CreateIndex
CREATE INDEX "sms_automation_rules_tenant_id_is_active_idx" ON "sms_automation_rules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "sms_automation_rules_tenant_id_trigger_type_idx" ON "sms_automation_rules"("tenant_id", "trigger_type");

-- CreateIndex
CREATE INDEX "sms_automation_rules_tenant_id_priority_idx" ON "sms_automation_rules"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "report_schedules_tenant_report_idx" ON "report_schedules"("tenant_id", "report_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenant_id_employee_id_notification_key" ON "notification_preferences"("tenant_id", "employee_id", "notification_type", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_slug_key" ON "accounts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "locations_id_key" ON "locations"("id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_id_key" ON "locations"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_unique" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "departments_active_idx" ON "departments"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_unique" ON "departments"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "tax_configurations_tenant_id_is_active_idx" ON "tax_configurations"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "tax_configurations_tenant_id_tax_type_idx" ON "tax_configurations"("tenant_id", "tax_type");

-- CreateIndex
CREATE INDEX "employee_bank_accounts_employee_idx" ON "employee_bank_accounts"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_bank_accounts_status_idx" ON "employee_bank_accounts"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_payroll_prefs_employee_unique" ON "employee_payroll_prefs"("tenant_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_tax_info_employee_unique" ON "employee_tax_info"("tenant_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_pins_employee_id_key" ON "employee_pins"("employee_id");

-- CreateIndex
CREATE INDEX "employee_locations_employee_idx" ON "employee_locations"("employee_id");

-- CreateIndex
CREATE INDEX "employee_locations_location_idx" ON "employee_locations"("location_id");

-- CreateIndex
CREATE INDEX "employee_seniority_employee_idx" ON "employee_seniority"("employee_id");

-- CreateIndex
CREATE INDEX "employee_seniority_current_idx" ON "employee_seniority"("tenant_id", "employee_id", "effective_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_unique" ON "skills"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "user_preferences_tenant_id_category_idx" ON "user_preferences"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_tenant_id_user_id_preference_key_category_key" ON "user_preferences"("tenant_id", "user_id", "preference_key", "category");
