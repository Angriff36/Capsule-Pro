/**
 * Setup file for integration tests that require real database access.
 *
 * This file runs before integration tests to ensure proper environment
 * configuration for database connections.
 */

// Load environment variables from .env.local for integration tests
// This is needed because vitest in node environment doesn't auto-load .env files
import { config } from "dotenv";
import { beforeAll } from "vitest";

// Load the .env.local file which contains DATABASE_URL
const envPath = `${process.cwd()}/.env.local`;
config({ path: envPath });

// Set test environment before any tests run
beforeAll(() => {
  // Ensure we're using the test environment
  // Use bracket notation to avoid TypeScript readonly error for NODE_ENV
  // @ts-expect-error - NODE_ENV is readonly in newer Node.js types but is writable at runtime
  process.env.NODE_ENV = "test";

  console.log("[integration] Setting up integration tests with real database");
  console.log(
    "[integration] DATABASE_URL host:",
    process.env.DATABASE_URL?.split("@")[1]?.split("?")[0]
  );
});
