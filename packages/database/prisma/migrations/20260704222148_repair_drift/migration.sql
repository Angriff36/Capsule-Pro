-- Trimmed from the `pnpm db:repair` / prisma migrate diff (vs live DB) output 2026-07-04.
-- KEPT: (a) the five additive columns from the domain-links/provenance source change
-- (VendorCatalog->InventoryItem mapping, InventorySupplier->Vendor bridge,
-- PurchaseRequisition prep-demand provenance), and (b) the 11 missing
-- sel_onboarding_training_*_definitions tables (additive CREATE IF NOT EXISTS in
-- schema "public" per their @@schema; the SEL training seed reactions target them).
-- DROPPED: the long-ACCEPTED upstream prisma-projection drift (timestamptz->TIMESTAMP(3)
-- narrowing, SET DEFAULT '' on FK columns, enum-typed status columns, index backfill)
-- which must NOT be folded into a migration while the upstream projection fix is pending.

ALTER TABLE "tenant_inventory"."inventory_suppliers" ADD COLUMN IF NOT EXISTS "vendor_id" TEXT DEFAULT '';

ALTER TABLE "tenant_inventory"."purchase_requisitions" ADD COLUMN IF NOT EXISTS "source_type" TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "supplier_id" TEXT DEFAULT '';

ALTER TABLE "tenant_inventory"."purchase_requisition_items" ADD COLUMN IF NOT EXISTS "source_prep_list_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "tenant_inventory"."vendor_catalogs" ADD COLUMN IF NOT EXISTS "inventory_item_id" TEXT DEFAULT '';

-- CreateTable
CREATE TABLE "sel_onboarding_training_module_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'sel_event_staff_onboarding',
    "title" TEXT NOT NULL DEFAULT 'SEL Event Staff — Onboarding Training',
    "description" TEXT NOT NULL DEFAULT 'Required pre-shift training for all Mangia staff working SEL Friday Lunch events. Covers client context, compliance requirements, pre-event workflow, buffet service, and wrap-up procedures. Must be completed before first shift.',
    "content_type" TEXT NOT NULL DEFAULT 'interactive',
    "content_url" TEXT NOT NULL DEFAULT 'TBD',
    "duration_minutes" INTEGER NOT NULL DEFAULT 20,
    "category" TEXT NOT NULL DEFAULT 'onboarding',
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "pass_threshold_percent" INTEGER NOT NULL DEFAULT 80,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "required_role" TEXT NOT NULL DEFAULT 'staff',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_module_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question01_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT '1a4f8a91-f4ee-48cd-9178-171c9c75fceb',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q1',
    "section_title" TEXT NOT NULL DEFAULT 'Context',
    "display_order" INTEGER NOT NULL DEFAULT 1,
    "prompt" TEXT NOT NULL DEFAULT 'Mangia is SEL''s only catering vendor on Friday Lunch events.',
    "option_a" TEXT NOT NULL DEFAULT 'True',
    "option_b" TEXT NOT NULL DEFAULT 'False',
    "option_c" TEXT NOT NULL DEFAULT '',
    "option_d" TEXT NOT NULL DEFAULT '',
    "correct_option_key" TEXT NOT NULL DEFAULT 'B',
    "explanation" TEXT NOT NULL DEFAULT 'False. Mangia is not SEL''s only Friday Lunch vendor.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'Staff need to understand we earn our spot.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question01_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question02_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT 'cad9ca72-2f74-430f-9b04-d9956b865509',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q2',
    "section_title" TEXT NOT NULL DEFAULT 'Context',
    "display_order" INTEGER NOT NULL DEFAULT 2,
    "prompt" TEXT NOT NULL DEFAULT 'What is SEL''s primary reason for choosing Mangia over other vendors?',
    "option_a" TEXT NOT NULL DEFAULT 'We are the cheapest option',
    "option_b" TEXT NOT NULL DEFAULT 'We are the closest to campus',
    "option_c" TEXT NOT NULL DEFAULT 'Professionalism, quality, and consistency',
    "option_d" TEXT NOT NULL DEFAULT 'We have the most staff available',
    "correct_option_key" TEXT NOT NULL DEFAULT 'C',
    "explanation" TEXT NOT NULL DEFAULT 'SEL chooses Mangia for professionalism, quality, and consistency.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'This is the service standard every SEL shift must reinforce.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question02_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question03_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT 'c0d36c00-3b06-4d74-a026-b619883d0578',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q3',
    "section_title" TEXT NOT NULL DEFAULT 'Compliance',
    "display_order" INTEGER NOT NULL DEFAULT 3,
    "prompt" TEXT NOT NULL DEFAULT 'Your WA State Food Worker Card must be current...',
    "option_a" TEXT NOT NULL DEFAULT 'Within 30 days of your first shift',
    "option_b" TEXT NOT NULL DEFAULT 'Before your first shift',
    "option_c" TEXT NOT NULL DEFAULT 'Within your first week',
    "option_d" TEXT NOT NULL DEFAULT 'By the end of your first month',
    "correct_option_key" TEXT NOT NULL DEFAULT 'B',
    "explanation" TEXT NOT NULL DEFAULT 'Your WA State Food Worker Card must be current before your first shift.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'No current card means you are not shift-ready.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question03_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question04_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT '05e4752c-e786-42d0-91e8-c0b638e0ba33',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q4',
    "section_title" TEXT NOT NULL DEFAULT 'Compliance',
    "display_order" INTEGER NOT NULL DEFAULT 4,
    "prompt" TEXT NOT NULL DEFAULT 'Where do you pick up your SEL visitor badge?',
    "option_a" TEXT NOT NULL DEFAULT 'At your assigned building',
    "option_b" TEXT NOT NULL DEFAULT 'At the Mangia vehicle',
    "option_c" TEXT NOT NULL DEFAULT 'At Building One security desk',
    "option_d" TEXT NOT NULL DEFAULT 'The BOH Lead brings it to you',
    "correct_option_key" TEXT NOT NULL DEFAULT 'C',
    "explanation" TEXT NOT NULL DEFAULT 'Pick up the badge at Building One security desk.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'Arriving at the right check-in point prevents delays.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question04_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question05_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT '2c8fb412-5928-4410-97fe-c8d3fa90fd5f',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q5',
    "section_title" TEXT NOT NULL DEFAULT 'Compliance',
    "display_order" INTEGER NOT NULL DEFAULT 5,
    "prompt" TEXT NOT NULL DEFAULT 'Where must your visitor badge be worn at all times on SEL campus?',
    "option_a" TEXT NOT NULL DEFAULT 'In your pocket for safekeeping',
    "option_b" TEXT NOT NULL DEFAULT 'Clipped to your bag',
    "option_c" TEXT NOT NULL DEFAULT 'Above the waistline, visible at all times',
    "option_d" TEXT NOT NULL DEFAULT 'Anywhere comfortable',
    "correct_option_key" TEXT NOT NULL DEFAULT 'C',
    "explanation" TEXT NOT NULL DEFAULT 'Wear the badge above the waistline and keep it visible.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'Campus badge rules are mandatory, not optional.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question05_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question06_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT '504c8378-1eee-4e4c-a489-a746c417d489',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q6',
    "section_title" TEXT NOT NULL DEFAULT 'Pre-Event Workflow',
    "display_order" INTEGER NOT NULL DEFAULT 6,
    "prompt" TEXT NOT NULL DEFAULT 'Put the pre-event steps in the correct order:',
    "option_a" TEXT NOT NULL DEFAULT 'Badge → Clock in → Arrive → Meet crew',
    "option_b" TEXT NOT NULL DEFAULT 'Arrive → Clock in → Badge → Meet crew',
    "option_c" TEXT NOT NULL DEFAULT 'Arrive → Badge → Clock in → Meet crew',
    "option_d" TEXT NOT NULL DEFAULT 'Clock in → Arrive → Badge → Meet crew',
    "correct_option_key" TEXT NOT NULL DEFAULT 'B',
    "explanation" TEXT NOT NULL DEFAULT 'The correct order is Arrive → Clock in → Badge → Meet crew.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'The sequence matters for timekeeping, access, and crew readiness.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question06_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question07_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT 'fab41a4d-86bb-4587-991f-8a60f02466df',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q7',
    "section_title" TEXT NOT NULL DEFAULT 'Pre-Event Workflow',
    "display_order" INTEGER NOT NULL DEFAULT 7,
    "prompt" TEXT NOT NULL DEFAULT 'When do you clock in on Nowsta?',
    "option_a" TEXT NOT NULL DEFAULT 'After you pick up your badge',
    "option_b" TEXT NOT NULL DEFAULT 'When the BOH Lead arrives',
    "option_c" TEXT NOT NULL DEFAULT 'At your scheduled start time when you arrive on site',
    "option_d" TEXT NOT NULL DEFAULT 'When service begins',
    "correct_option_key" TEXT NOT NULL DEFAULT 'C',
    "explanation" TEXT NOT NULL DEFAULT 'Clock in at your scheduled start time when you arrive on site.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'Nowsta timekeeping starts when you are on site and ready to work.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question07_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question08_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT 'd7cbf992-dde5-4af1-8f96-a25e162ab385',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q8',
    "section_title" TEXT NOT NULL DEFAULT 'Buffet Service',
    "display_order" INTEGER NOT NULL DEFAULT 8,
    "prompt" TEXT NOT NULL DEFAULT 'During buffet service, which portion do Mangia staff always serve?',
    "option_a" TEXT NOT NULL DEFAULT 'Side dishes only',
    "option_b" TEXT NOT NULL DEFAULT 'Everything equally',
    "option_c" TEXT NOT NULL DEFAULT 'The protein',
    "option_d" TEXT NOT NULL DEFAULT 'Whatever the BOH Lead decides on the day',
    "correct_option_key" TEXT NOT NULL DEFAULT 'C',
    "explanation" TEXT NOT NULL DEFAULT 'Mangia staff always serve the protein during buffet service.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'Serving responsibilities need to stay consistent across lines.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question08_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question09_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT '4f71378e-8c1d-4f01-b4a7-9393df1da0f8',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q9',
    "section_title" TEXT NOT NULL DEFAULT 'Buffet Service',
    "display_order" INTEGER NOT NULL DEFAULT 9,
    "prompt" TEXT NOT NULL DEFAULT 'What is the typical staffing configuration per buffet line?',
    "option_a" TEXT NOT NULL DEFAULT '1 Server + 1 Runner',
    "option_b" TEXT NOT NULL DEFAULT '3 Servers',
    "option_c" TEXT NOT NULL DEFAULT '2 Servers + 1 Runner',
    "option_d" TEXT NOT NULL DEFAULT '2 Runners + 1 Server',
    "correct_option_key" TEXT NOT NULL DEFAULT 'C',
    "explanation" TEXT NOT NULL DEFAULT 'A typical line uses 2 Servers and 1 Runner.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'Knowing the standard line build helps staff slot in quickly.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question09_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "sel_onboarding_training_question10_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL DEFAULT '67760aa3-4fca-4c3d-92ef-bdad9c8d7b89',
    "module_id" TEXT NOT NULL DEFAULT 'f8c17fcf-54fb-4e41-9bea-cbb13a353ebb',
    "code" TEXT NOT NULL DEFAULT 'Q10',
    "section_title" TEXT NOT NULL DEFAULT 'Wrap-Up',
    "display_order" INTEGER NOT NULL DEFAULT 10,
    "prompt" TEXT NOT NULL DEFAULT 'Which of the following is the correct final checkout sequence?',
    "option_a" TEXT NOT NULL DEFAULT 'Clock out → Return badge → Sign out → Check in with BOH Lead',
    "option_b" TEXT NOT NULL DEFAULT 'Check in with BOH Lead → Sign out of staff sheet → Return SEL badge → Clock out of Nowsta',
    "option_c" TEXT NOT NULL DEFAULT 'Return badge → Clock out → Sign out → Check in with BOH Lead',
    "option_d" TEXT NOT NULL DEFAULT 'Sign out → Return badge → Check in with BOH Lead → Clock out',
    "correct_option_key" TEXT NOT NULL DEFAULT 'B',
    "explanation" TEXT NOT NULL DEFAULT 'The correct sequence is Check in with BOH Lead → Sign out → Return badge → Clock out.',
    "why_it_matters" TEXT NOT NULL DEFAULT 'The checkout order closes accountability and campus access correctly.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sel_onboarding_training_question10_definitions_pkey" PRIMARY KEY ("tenant_id","id")
);
