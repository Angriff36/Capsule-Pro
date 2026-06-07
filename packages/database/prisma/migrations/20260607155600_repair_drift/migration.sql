CREATE TABLE IF NOT EXISTS "AiEventSetupSession" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "AutomatedFollowup" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "Budget" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "Deal" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "EntityVersion" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "EventWaitlistEntry" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "FacilitySchedule" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "FacilityWorkOrder" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "LogisticsDispatch" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "PerformancePrediction" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "SampleData" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "seededAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "isSeeded" BOOLEAN DEFAULT false,
    "eventsCreated" INTEGER DEFAULT 0,
    "clientsCreated" INTEGER DEFAULT 0,
    "usersCreated" INTEGER DEFAULT 0,
    "recipesCreated" INTEGER DEFAULT 0,

    CONSTRAINT "SampleData_pkey" PRIMARY KEY ("tenantId","id")
);

CREATE TABLE IF NOT EXISTS "StaffPerformance" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "Vendor" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS "VersionApproval" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "entityVersionId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comments" TEXT DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "VersionApproval_pkey" PRIMARY KEY ("tenantId","id")
);

CREATE TABLE IF NOT EXISTS "VersionedEntity" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "isLocked" BOOLEAN DEFAULT false,
    "currentVersionId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "VersionedEntity_pkey" PRIMARY KEY ("tenantId","id")
);

CREATE TABLE IF NOT EXISTS "WorkforceOptimization" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "locationId" TEXT DEFAULT '',
    "optimizationType" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkforceOptimization_pkey" PRIMARY KEY ("tenantId","id")
);;
