Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Mock server-only module for all tests
vitest_1.vi.mock("server-only", () => ({}));
