/**
 * Test helpers for API route tests
 */
import type { CurrentUser } from "@/app/lib/tenant";
import { NextRequest } from "next/server";

/**
 * Default test user with all required CurrentUser properties
 */
export const TEST_USER: CurrentUser = {
  id: "test-user-id",
  tenantId: "test-tenant-id",
  role: "admin",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
};

/**
 * Create a test user with custom properties
 */
export function createTestUser(
  overrides: Partial<CurrentUser> = {}
): CurrentUser {
  return { ...TEST_USER, ...overrides };
}

/**
 * Create a mock NextRequest from a URL
 */
export function createMockRequest(
  url: string,
  options: ConstructorParameters<typeof NextRequest>[1] = {}
): NextRequest {
  return new NextRequest(new URL(url), options);
}
