import { vi } from "vitest";

// Mock server-only module for all tests
vi.mock("server-only", () => ({}));
