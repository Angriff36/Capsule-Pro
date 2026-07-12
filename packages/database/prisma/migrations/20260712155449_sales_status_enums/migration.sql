-- WS7 sales status enums: 5 text status columns -> native Postgres enums.
-- Prisma migrate emitted DROP COLUMN + ADD COLUMN (Prisma cannot cast text->enum), which
-- destroys data on a non-empty table. Hand-rewritten to in-place
-- `ALTER COLUMN ... TYPE ... USING` so existing rows survive a prod deploy.
-- Gate-review fix 2026-07-12: Postgres rejects ALTER TYPE while a text DEFAULT
-- exists ("default for column cannot be cast automatically"), so each column
-- DROPs its default, alters with USING, then SETs the enum default back.
-- This migration is PENDING (never applied anywhere) -> mutable per canonical rule.
-- Pre-flight before any non-empty deploy: `SELECT DISTINCT status FROM <table>` per table.

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

-- AlterTable: text -> enum, in-place value-preserving (drop default, cast, restore default)
ALTER TABLE "tenant"."documents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant"."documents" ALTER COLUMN "status" TYPE "DocumentStatus" USING "status"::text::"DocumentStatus";
ALTER TABLE "tenant"."documents" ALTER COLUMN "status" SET DEFAULT 'uploaded';

ALTER TABLE "tenant_crm"."call_planning_sessions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_crm"."call_planning_sessions" ALTER COLUMN "status" TYPE "CallPlanningSessionStatus" USING "status"::text::"CallPlanningSessionStatus";
ALTER TABLE "tenant_crm"."call_planning_sessions" ALTER COLUMN "status" SET DEFAULT 'active';

ALTER TABLE "tenant_crm"."client_interactions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_crm"."client_interactions" ALTER COLUMN "status" TYPE "ClientInteractionStatus" USING "status"::text::"ClientInteractionStatus";
ALTER TABLE "tenant_crm"."client_interactions" ALTER COLUMN "status" SET DEFAULT 'open';

ALTER TABLE "tenant_crm"."leads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_crm"."leads" ALTER COLUMN "status" TYPE "LeadStatus" USING "status"::text::"LeadStatus";
ALTER TABLE "tenant_crm"."leads" ALTER COLUMN "status" SET DEFAULT 'new';

ALTER TABLE "tenant_crm"."proposal_drafts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_crm"."proposal_drafts" ALTER COLUMN "status" TYPE "ProposalDraftStatus" USING "status"::text::"ProposalDraftStatus";
ALTER TABLE "tenant_crm"."proposal_drafts" ALTER COLUMN "status" SET DEFAULT 'draft';
