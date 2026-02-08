/**
 * Smoke test for Capsule-Pro route generator
 *
 * Verifies that the generator produces routes with:
 * - Correct Prisma model usage (database.recipe.findMany, not runtime.query)
 * - Tenant filtering (tenantId in where clause)
 * - Soft delete filtering (deletedAt: null)
 * - Ordering (orderBy createdAt)
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_OUTPUT_DIR = join(process.cwd(), 'test-output');
const TEST_ROUTE_PATH = join(TEST_OUTPUT_DIR, 'app/api/kitchen/manifest/recipes/route.ts');

describe('Capsule-Pro Generator Smoke Test', () => {
  beforeAll(() => {
    // Clean up any previous test output
    rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    mkdirSync(join(TEST_OUTPUT_DIR, 'app/api/kitchen/manifest/recipes'), { recursive: true });
  });

  afterAll(() => {
    // Clean up test output
    rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  test('generates route with direct Prisma query, not runtime.query()', () => {
    // Generate the route
    execSync(
      `npx tsx bin/capsule-pro-generate.ts Recipe ../../packages/kitchen-ops/manifests/recipe-rules.manifest --output ${TEST_ROUTE_PATH}`,
      { cwd: process.cwd(), encoding: 'utf-8' }
    );

    // Read generated file
    const generated = readFileSync(TEST_ROUTE_PATH, 'utf-8');

    // Should NOT use runtime.query()
    expect(generated).not.toContain('runtime.query(');

    // Should use Prisma directly
    expect(generated).toContain('database.recipe.findMany');
  });

  test('includes tenant filtering', () => {
    const generated = readFileSync(TEST_ROUTE_PATH, 'utf-8');
    expect(generated).toContain('tenantId');
    expect(generated).toMatch(/where:\s*{[\s\S]*tenantId/);
  });

  test('includes soft-delete filtering', () => {
    const generated = readFileSync(TEST_ROUTE_PATH, 'utf-8');
    expect(generated).toContain('deletedAt: null');
  });

  test('includes ordering by createdAt', () => {
    const generated = readFileSync(TEST_ROUTE_PATH, 'utf-8');
    expect(generated).toContain('orderBy');
    expect(generated).toContain('createdAt');
  });

  test('does NOT create unnecessary runtime context for GET', () => {
    const generated = readFileSync(TEST_ROUTE_PATH, 'utf-8');

    // Should not have runtime context creation for GET
    expect(generated).not.toContain('createRecipeRuntime');
    expect(generated).not.toContain('KitchenOpsContext');
    expect(generated).not.toContain('storeProvider');
  });
});
