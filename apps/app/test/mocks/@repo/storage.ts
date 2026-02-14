/**
 * Mock for @repo/storage package
 *
 * This mock prevents loading the actual storage module in tests.
 */

import { vi } from "vitest";

// Mock the put function
export const put = vi.fn().mockResolvedValue({
  url: "https://example.com/image.jpg",
});
