CREATE TABLE IF NOT EXISTS "tenant_events"."event_staff" (
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

    CONSTRAINT "event_staff_pkey" PRIMARY KEY ("tenantId","id")
);

CREATE TABLE IF NOT EXISTS "tenant_staff"."staff_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "role" TEXT DEFAULT 'server',
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("tenantId","id")
);
