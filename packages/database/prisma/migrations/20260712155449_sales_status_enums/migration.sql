-- WS7 sales status enums: 5 text status columns -> native Postgres enums.
-- Prisma migrate emitted DROP COLUMN + ADD COLUMN (Prisma cannot cast text->enum), which
-- destroys data on a non-empty table. Hand-rewritten to in-place
-- `ALTER COLUMN ... TYPE ... USING` so existing rows survive a prod deploy (REVIEW-2
-- deploy-safe mandate). The column DEFAULT and NOT NULL are retained across the type
-- change; the end-state is identical to the DROP/ADD form but data-preserving.
-- Applies clean on the empty dev DB either way (already applied there via --create-only).
-- Pre-flight before any prod deploy: `SELECT DISTINCT status FROM <table>` per table --
-- any out-of-vocab value fails the USING cast loudly (preferable to silent data loss).

-- CreateEnum
CREATE TYPE "CallPlanningSessionStatus" AS ENUM ('active', 'finalizing', 'review', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "ClientInteractionStatus" AS ENUM ('open', 'scheduled', 'overdue', 'completed', 'escalated');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('uploaded', 'parsing', 'parsed', 'failed');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'disqualified');

-- CreateEnum
CREATE TYPE "ProposalDraftStatus" AS ENUM ('draft', 'sent', 'viewed', 'change_requested', 'approved', 'expired', 'converted');

-- AlterTable: text -> enum, data-preserving in-place USING cast (REVIEW-2 form).
ALTER TABLE "tenant"."documents" ALTER COLUMN "status" TYPE "DocumentStatus" USING "status"::text::"DocumentStatus";
ALTER TABLE "tenant_crm"."call_planning_sessions" ALTER COLUMN "status" TYPE "CallPlanningSessionStatus" USING "status"::text::"CallPlanningSessionStatus";
ALTER TABLE "tenant_crm"."client_interactions" ALTER COLUMN "status" TYPE "ClientInteractionStatus" USING "status"::text::"ClientInteractionStatus";
ALTER TABLE "tenant_crm"."leads" ALTER COLUMN "status" TYPE "LeadStatus" USING "status"::text::"LeadStatus";
ALTER TABLE "tenant_crm"."proposal_drafts" ALTER COLUMN "status" TYPE "ProposalDraftStatus" USING "status"::text::"ProposalDraftStatus";
