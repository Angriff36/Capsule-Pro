-- CreateTable
CREATE TABLE "tenant_crm"."interaction_attachments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interaction_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "interaction_attachments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE INDEX "interaction_attachments_interaction_id_idx" ON "tenant_crm"."interaction_attachments"("interaction_id");

-- AddForeignKey
ALTER TABLE "tenant_crm"."interaction_attachments"
    ADD CONSTRAINT "interaction_attachments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_crm"."interaction_attachments"
    ADD CONSTRAINT "interaction_attachments_interaction_id_fkey"
    FOREIGN KEY ("tenant_id", "interaction_id") REFERENCES "tenant_crm"."client_interactions"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "tenant_crm"."interaction_attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "tenant_crm"."interaction_attachments"
    USING (tenant_id = (SELECT (auth.jwt() ->> 'tenant_id')::uuid));
