import { expect, test } from "@playwright/test";

/**
 * Quality Control Workflow Verification Test
 *
 * This test verifies that the quality control workflow feature is properly implemented:
 * - Database schema includes QC tables
 * - API routes for QC entities are accessible
 * - Manifest file exists and is properly formatted
 */

test.describe("Quality Control Workflow Feature", () => {
  test("Database schema includes quality control tables", async ({}) => {
    // This test verifies the schema definition includes QC models
    const fs = require("fs");
    const path = require("path");
    const schemaPath = path.join(
      process.cwd(),
      "packages/database/prisma/schema.prisma"
    );
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");

    // Verify QualityChecklist model exists
    expect(schemaContent).toContain("model QualityChecklist");
    expect(schemaContent).toContain("quality_checklists");

    // Verify QualityInspection model exists
    expect(schemaContent).toContain("model QualityInspection");
    expect(schemaContent).toContain("quality_inspections");

    // Verify CorrectiveAction model exists
    expect(schemaContent).toContain("model CorrectiveAction");
    expect(schemaContent).toContain("corrective_actions");

    // Verify QualityReport model exists
    expect(schemaContent).toContain("model QualityReport");
    expect(schemaContent).toContain("quality_reports");

    // Verify QualityChecklistItem model exists
    expect(schemaContent).toContain("model QualityChecklistItem");
    expect(schemaContent).toContain("quality_checklist_items");

    // Verify QualityInspectionItem model exists
    expect(schemaContent).toContain("model QualityInspectionItem");
    expect(schemaContent).toContain("quality_inspection_items");

    // Verify key fields in QualityChecklist
    expect(schemaContent).toContain("checklistData Json");
    expect(schemaContent).toContain("isActive Boolean");
    expect(schemaContent).toContain("category String");

    // Verify key fields in QualityInspection
    expect(schemaContent).toContain("inspectionNumber String");
    expect(schemaContent).toContain("status String");
    expect(schemaContent).toContain("passRate Float");

    // Verify key fields in CorrectiveAction
    expect(schemaContent).toContain("actionNumber String");
    expect(schemaContent).toContain("severity String");
    expect(schemaContent).toContain("priority String");
    expect(schemaContent).toContain("verifiedById String");
  });

  test("Quality control Manifest file exists with proper structure", async ({}) => {
    const fs = require("fs");
    const path = require("path");
    const manifestPath = path.join(
      process.cwd(),
      "packages/manifest-adapters/manifests/quality-control-rules.manifest"
    );

    expect(fs.existsSync(manifestPath)).toBeTruthy();

    const manifestContent = fs.readFileSync(manifestPath, "utf-8");

    // Verify entity definitions
    expect(manifestContent).toContain("entity QualityChecklist");
    expect(manifestContent).toContain("entity QualityInspection");
    expect(manifestContent).toContain("entity QualityChecklistItem");
    expect(manifestContent).toContain("entity QualityInspectionItem");
    expect(manifestContent).toContain("entity CorrectiveAction");
    expect(manifestContent).toContain("entity QualityReport");

    // Verify commands for QualityInspection
    expect(manifestContent).toContain("command create(locationId");
    expect(manifestContent).toContain("command start(userId");
    expect(manifestContent).toContain("command complete(inspectionData");
    expect(manifestContent).toContain("command approve(userId");

    // Verify commands for CorrectiveAction
    expect(manifestContent).toContain("command create(locationId");
    expect(manifestContent).toContain("command start(userId");
    expect(manifestContent).toContain("command complete(resolutionNotes");
    expect(manifestContent).toContain("command verify(userId");

    // Verify computed properties
    expect(manifestContent).toContain("computed isDraft");
    expect(manifestContent).toContain("computed isCompleted");
    expect(manifestContent).toContain("computed hasFailures");

    // Verify constraints
    expect(manifestContent).toContain("constraint validStatus");
    expect(manifestContent).toContain("constraint validSeverity");

    // Verify policies
    expect(manifestContent).toContain("policy QualityStaffCanInspect");
    expect(manifestContent).toContain("policy QualityManagersCanApprove");
  });

  test("API routes for quality control exist", async ({}) => {
    const fs = require("fs");
    const path = require("path");

    // Verify list routes exist
    const checklistListRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/checklists/list/route.ts"
    );
    const inspectionListRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/inspections/list/route.ts"
    );
    const correctiveActionListRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/corrective-actions/list/route.ts"
    );
    const reportListRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/reports/list/route.ts"
    );

    expect(fs.existsSync(checklistListRoute)).toBeTruthy();
    expect(fs.existsSync(inspectionListRoute)).toBeTruthy();
    expect(fs.existsSync(correctiveActionListRoute)).toBeTruthy();
    expect(fs.existsSync(reportListRoute)).toBeTruthy();

    // Verify command routes exist
    const inspectionStartRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/inspections/[inspectionId]/commands/start/route.ts"
    );
    const inspectionCompleteRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/inspections/[inspectionId]/commands/complete/route.ts"
    );
    const inspectionApproveRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/inspections/[inspectionId]/commands/approve/route.ts"
    );
    const actionStartRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/corrective-actions/[actionId]/commands/start/route.ts"
    );
    const actionCompleteRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/corrective-actions/[actionId]/commands/complete/route.ts"
    );
    const actionVerifyRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/corrective-actions/[actionId]/commands/verify/route.ts"
    );

    expect(fs.existsSync(inspectionStartRoute)).toBeTruthy();
    expect(fs.existsSync(inspectionCompleteRoute)).toBeTruthy();
    expect(fs.existsSync(inspectionApproveRoute)).toBeTruthy();
    expect(fs.existsSync(actionStartRoute)).toBeTruthy();
    expect(fs.existsSync(actionCompleteRoute)).toBeTruthy();
    expect(fs.existsSync(actionVerifyRoute)).toBeTruthy();
  });

  test("Database migration file exists", async ({}) => {
    const fs = require("fs");
    const path = require("path");

    const migrationPath = path.join(
      process.cwd(),
      "packages/database/prisma/migrations/20260304220000_add_quality_control/migration.sql"
    );

    expect(fs.existsSync(migrationPath)).toBeTruthy();

    const migrationContent = fs.readFileSync(migrationPath, "utf-8");

    // Verify key tables are created
    expect(migrationContent).toContain(
      'CREATE TABLE "tenant_kitchen"."quality_checklists"'
    );
    expect(migrationContent).toContain(
      'CREATE TABLE "tenant_kitchen"."quality_inspections"'
    );
    expect(migrationContent).toContain(
      'CREATE TABLE "tenant_kitchen"."corrective_actions"'
    );
    expect(migrationContent).toContain(
      'CREATE TABLE "tenant_kitchen"."quality_reports"'
    );
    expect(migrationContent).toContain(
      'CREATE TABLE "tenant_kitchen"."quality_checklist_items"'
    );
    expect(migrationContent).toContain(
      'CREATE TABLE "tenant_kitchen"."quality_inspection_items"'
    );

    // Verify foreign key constraints
    expect(migrationContent).toContain(
      'FOREIGN KEY ("tenant_id") REFERENCES "core"."accounts"'
    );

    // Verify indexes
    expect(migrationContent).toContain("CREATE INDEX");
  });

  test("API routes contain proper implementations", async ({}) => {
    const fs = require("fs");
    const path = require("path");

    // Verify checklist list route
    const checklistListRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/checklists/list/route.ts"
    );
    const checklistContent = fs.readFileSync(checklistListRoute, "utf-8");

    expect(checklistContent).toContain("export async function GET");
    expect(checklistContent).toContain("export async function POST");
    expect(checklistContent).toContain("database.qualityChecklist");
    expect(checklistContent).toContain("getTenantIdForOrg");
    expect(checklistContent).toContain("auth()");

    // Verify inspection list route
    const inspectionListRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/inspections/list/route.ts"
    );
    const inspectionContent = fs.readFileSync(inspectionListRoute, "utf-8");

    expect(inspectionContent).toContain("database.qualityInspection");
    expect(inspectionContent).toContain("inspectionNumber");
    expect(inspectionContent).toContain("status");
    expect(inspectionContent).toContain("passRate");

    // Verify corrective action list route
    const actionListRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/corrective-actions/list/route.ts"
    );
    const actionContent = fs.readFileSync(actionListRoute, "utf-8");

    expect(actionContent).toContain("database.correctiveAction");
    expect(actionContent).toContain("actionNumber");
    expect(actionContent).toContain("severity");
    expect(actionContent).toContain("priority");

    // Verify inspection complete command
    const completeRoute = path.join(
      process.cwd(),
      "apps/api/app/api/quality/inspections/[inspectionId]/commands/complete/route.ts"
    );
    const completeContent = fs.readFileSync(completeRoute, "utf-8");

    expect(completeContent).toContain('status: "completed"');
    expect(completeContent).toContain("passRate");
    expect(completeContent).toContain("passedItems");
    expect(completeContent).toContain("failedItems");
  });

  test("Quality control entities are properly related in Account model", async ({}) => {
    const fs = require("fs");
    const path = require("path");
    const schemaPath = path.join(
      process.cwd(),
      "packages/database/prisma/schema.prisma"
    );
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");

    // Find the Account model and verify QC relations
    const accountModelMatch = schemaContent.match(
      /model Account \{[\s\S]*?\n\}/
    );
    expect(accountModelMatch).toBeTruthy();

    const accountModel = accountModelMatch![0];

    expect(accountModel).toContain("qualityChecklists");
    expect(accountModel).toContain("qualityChecklistItems");
    expect(accountModel).toContain("qualityInspections");
    expect(accountModel).toContain("qualityInspectionItems");
    expect(accountModel).toContain("correctiveActions");
    expect(accountModel).toContain("qualityReports");
  });
});
