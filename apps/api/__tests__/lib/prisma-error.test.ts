/**
 * Prisma Error Translator Tests
 *
 * Tests the translation of Prisma error codes to appropriate HTTP status codes.
 *
 * @see apps/api/lib/prisma-error.ts
 */

import { describe, expect, it } from "vitest";
import {
	translatePrismaError,
	isPrismaErrorResponse,
	PrismaErrorResponse,
	PRISMA_ERROR_STATUS,
} from "../../lib/prisma-error";

// Helper to create mock Prisma errors
function createPrismaError(code: string, message?: string): Error {
	const error = new Error(message ?? `Prisma error: ${code}`) as Error & {
		code: string;
		meta?: Record<string, unknown>;
	};
	error.code = code;
	return error;
}

describe("PRISMA_ERROR_STATUS constants", () => {
	it("has P2002 mapped to 409 (conflict)", () => {
		expect(PRISMA_ERROR_STATUS.P2002).toBe(409);
	});

	it("has P2025 mapped to 404 (not found)", () => {
		expect(PRISMA_ERROR_STATUS.P2025).toBe(404);
	});

	it("has P2003 mapped to 400 (bad request)", () => {
		expect(PRISMA_ERROR_STATUS.P2003).toBe(400);
	});

	it("has P2014 mapped to 400 (bad request)", () => {
		expect(PRISMA_ERROR_STATUS.P2014).toBe(400);
	});
});

describe("translatePrismaError", () => {
	describe("P2002 - Unique constraint violation", () => {
		it("returns 409 status for P2002", () => {
			const error = createPrismaError("P2002");
			const result = translatePrismaError(error);
			expect(result.status).toBe(409);
		});

		it("classifies as 'conflict' type", () => {
			const error = createPrismaError("P2002");
			const result = translatePrismaError(error);
			expect(result.type).toBe("conflict");
		});

		it("returns safe message without database details", () => {
			const error = createPrismaError(
				"P2002",
				"Unique constraint failed on the `email` field",
			);
			const result = translatePrismaError(error);
			expect(result.message).toBe("A record with this value already exists");
			expect(result.message).not.toContain("email");
			expect(result.message).not.toContain("Prisma");
		});

		it("returns mapped: true", () => {
			const error = createPrismaError("P2002");
			const result = translatePrismaError(error);
			expect(result.mapped).toBe(true);
		});
	});

	describe("P2025 - Record not found", () => {
		it("returns 404 status for P2025", () => {
			const error = createPrismaError("P2025");
			const result = translatePrismaError(error);
			expect(result.status).toBe(404);
		});

		it("classifies as 'not_found' type", () => {
			const error = createPrismaError("P2025");
			const result = translatePrismaError(error);
			expect(result.type).toBe("not_found");
		});

		it("returns safe message without database details", () => {
			const error = createPrismaError(
				"P2025",
				"Record to delete does not exist",
			);
			const result = translatePrismaError(error);
			expect(result.message).toBe("The requested resource was not found");
			expect(result.message).not.toContain("Prisma");
		});

		it("returns mapped: true", () => {
			const error = createPrismaError("P2025");
			const result = translatePrismaError(error);
			expect(result.mapped).toBe(true);
		});
	});

	describe("P2001 - Record to update not found", () => {
		it("returns 404 status for P2001", () => {
			const error = createPrismaError("P2001");
			const result = translatePrismaError(error);
			expect(result.status).toBe(404);
		});

		it("classifies as 'not_found' type", () => {
			const error = createPrismaError("P2001");
			const result = translatePrismaError(error);
			expect(result.type).toBe("not_found");
		});
	});

	describe("P2003 - Foreign key violation", () => {
		it("returns 400 status for P2003", () => {
			const error = createPrismaError("P2003");
			const result = translatePrismaError(error);
			expect(result.status).toBe(400);
		});

		it("classifies as 'bad_request' type", () => {
			const error = createPrismaError("P2003");
			const result = translatePrismaError(error);
			expect(result.type).toBe("bad_request");
		});

		it("returns safe message without database details", () => {
			const error = createPrismaError(
				"P2003",
				"FOREIGN KEY constraint failed: userId does not exist",
			);
			const result = translatePrismaError(error);
			expect(result.message).toBe(
				"The request could not be processed due to a constraint violation",
			);
			expect(result.message).not.toContain("FOREIGN KEY");
			expect(result.message).not.toContain("userId");
		});

		it("returns mapped: true", () => {
			const error = createPrismaError("P2003");
			const result = translatePrismaError(error);
			expect(result.mapped).toBe(true);
		});
	});

	describe("P2014 - Relation violation", () => {
		it("returns 400 status for P2014", () => {
			const error = createPrismaError("P2014");
			const result = translatePrismaError(error);
			expect(result.status).toBe(400);
		});

		it("classifies as 'bad_request' type", () => {
			const error = createPrismaError("P2014");
			const result = translatePrismaError(error);
			expect(result.type).toBe("bad_request");
		});
	});

	describe("P2015 - Related record not found", () => {
		it("returns 400 status for P2015", () => {
			const error = createPrismaError("P2015");
			const result = translatePrismaError(error);
			expect(result.status).toBe(400);
		});

		it("classifies as 'bad_request' type", () => {
			const error = createPrismaError("P2015");
			const result = translatePrismaError(error);
			expect(result.type).toBe("bad_request");
		});
	});

	describe("Unknown errors", () => {
		it("returns 500 for non-Prisma errors", () => {
			const error = new Error("Something went wrong");
			const result = translatePrismaError(error);
			expect(result.status).toBe(500);
		});

		it("returns 500 for Prisma errors with unknown codes", () => {
			const error = createPrismaError("P9999");
			const result = translatePrismaError(error);
			expect(result.status).toBe(500);
		});

		it("classifies as 'unknown' type for non-Prisma errors", () => {
			const error = new Error("Something went wrong");
			const result = translatePrismaError(error);
			expect(result.type).toBe("unknown");
		});

		it("returns generic message for non-Prisma errors", () => {
			const error = new Error("Database connection failed");
			const result = translatePrismaError(error);
			expect(result.message).toBe("An unexpected error occurred");
			expect(result.message).not.toContain("connection");
		});

		it("returns mapped: false for unknown errors", () => {
			const error = new Error("Something went wrong");
			const result = translatePrismaError(error);
			expect(result.mapped).toBe(false);
		});
	});

	describe("Edge cases", () => {
		it("handles null input", () => {
			const result = translatePrismaError(null);
			expect(result.status).toBe(500);
			expect(result.mapped).toBe(false);
		});

		it("handles undefined input", () => {
			const result = translatePrismaError(undefined);
			expect(result.status).toBe(500);
			expect(result.mapped).toBe(false);
		});

		it("handles non-Error objects", () => {
			const result = translatePrismaError({ message: "oops" });
			expect(result.status).toBe(500);
			expect(result.mapped).toBe(false);
		});

		it("handles Error with missing code property", () => {
			const error = new Error("Some database error");
			// @ts-expect-error - Testing runtime behavior
			error.code = undefined;
			const result = translatePrismaError(error);
			expect(result.status).toBe(500);
			expect(result.mapped).toBe(false);
		});

		it("handles Error with non-string code property", () => {
			const error = new Error("Some database error") as Error & { code: number };
			error.code = 2002;
			const result = translatePrismaError(error);
			expect(result.status).toBe(500);
			expect(result.mapped).toBe(false);
		});
	});
});

describe("isPrismaErrorResponse", () => {
	it("returns true for PrismaErrorResponse instances", () => {
		const error = createPrismaError("P2002");
		const result = translatePrismaError(error);
		const prismaResponse = new PrismaErrorResponse(result);

		expect(isPrismaErrorResponse(prismaResponse)).toBe(true);
	});

	it("returns false for regular Error instances", () => {
		const error = new Error("Something went wrong");
		expect(isPrismaErrorResponse(error)).toBe(false);
	});

	it("returns false for non-error objects", () => {
		expect(isPrismaErrorResponse({ message: "oops" })).toBe(false);
		expect(isPrismaErrorResponse("error string")).toBe(false);
		expect(isPrismaErrorResponse(null)).toBe(false);
	});
});

describe("PrismaErrorResponse class", () => {
	it("preserves status from result", () => {
		const error = createPrismaError("P2002");
		const result = translatePrismaError(error);
		const response = new PrismaErrorResponse(result);
		expect(response.status).toBe(409);
	});

	it("preserves type from result", () => {
		const error = createPrismaError("P2002");
		const result = translatePrismaError(error);
		const response = new PrismaErrorResponse(result);
		expect(response.type).toBe("conflict");
	});

	it("preserves mapped flag from result", () => {
		const error = createPrismaError("P2002");
		const result = translatePrismaError(error);
		const response = new PrismaErrorResponse(result);
		expect(response.mapped).toBe(true);
	});

	it("uses message as error name", () => {
		const error = createPrismaError("P2025");
		const result = translatePrismaError(error);
		const response = new PrismaErrorResponse(result);
		expect(response.name).toBe("PrismaErrorResponse");
		expect(response.message).toBe("The requested resource was not found");
	});
});
