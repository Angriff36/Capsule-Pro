-- CreateTable: manifest_entity
-- Generic JSON-backed storage for Manifest entities (Phase 1-7)
-- Composite key: (tenant_id, entity_type, id)
CREATE TABLE "tenant"."manifest_entity" (
    "tenant_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "id" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifest_entity_pkey" PRIMARY KEY ("tenant_id","entity_type","id")
);

-- CreateTable: manifest_idempotency
-- Idempotency key storage for manifest command replay protection
CREATE TABLE "tenant"."manifest_idempotency" (
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "manifest_idempotency_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateIndex: manifest_entity lookup by tenant + type
CREATE INDEX "manifest_entity_tenant_id_entity_type_idx" ON "tenant"."manifest_entity"("tenant_id", "entity_type");

-- CreateIndex: manifest_idempotency TTL cleanup
CREATE INDEX "manifest_idempotency_expires_at_idx" ON "tenant"."manifest_idempotency"("expires_at");

-- AddForeignKey: manifest_entity -> accounts
ALTER TABLE "tenant"."manifest_entity" ADD CONSTRAINT "manifest_entity_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
