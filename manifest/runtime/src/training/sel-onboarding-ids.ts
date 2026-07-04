/**
 * Stable SEL event-staff onboarding seed IDs.
 * Must match defaults in manifest/source/staff/training-module-sel-rules.manifest
 * and middleware that pins moduleId on TrainingAssignment.create.
 */
export const SEL_ONBOARDING_MODULE_ID =
  "f8c17fcf-54fb-4e41-9bea-cbb13a353ebb";

export const SEL_ONBOARDING_QUESTION_IDS = {
  Q1: "1a4f8a91-f4ee-48cd-9178-171c9c75fceb",
  Q2: "cad9ca72-2f74-430f-9b04-d9956b865509",
  Q3: "c0d36c00-3b06-4d74-a026-b619883d0578",
  Q4: "05e4752c-e786-42d0-91e8-c0b638e0ba33",
  Q5: "2c8fb412-5928-4410-97fe-c8d3fa90fd5f",
  Q6: "504c8378-1eee-4e4c-a489-a746c417d489",
  Q7: "fab41a4d-86bb-4587-991f-8a60f02466df",
  Q8: "d7cbf992-dde5-4af1-8f96-a25e162ab385",
  Q9: "4f71378e-8c1d-4f01-b4a7-9393df1da0f8",
  Q10: "67760aa3-4fca-4c3d-92ef-bdad9c8d7b89",
} as const;

/** @deprecated Use SEL_ONBOARDING_MODULE_ID */
export const SEL_MODULE_ID = SEL_ONBOARDING_MODULE_ID;
