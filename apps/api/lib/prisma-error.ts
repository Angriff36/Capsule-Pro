/**
 * Prisma Error Translator
 *
 * Translates Prisma client error codes to appropriate HTTP status codes.
 * Without this utility, all database constraint violations surface as generic 500s.
 *
 * Error code mappings:
 * - P2002: Unique constraint violation → 409 Conflict
 * - P2025: Record not found → 404 Not Found
 * - P2003: Foreign key violation → 400 Bad Request
 * - P2014: Relation violation → 400 Bad Request
 *
 * @see IMPLEMENTATION_PLAN.md "14th Pass - Error Handling Audit"
 */

/**
 * HTTP status codes for Prisma error categories
 */
export const PRISMA_ERROR_STATUS = {
  /** P2002: Unique constraint failed on one of the fields */
  P2002: 409,
  /** P2025: The required record was not found */
  P2025: 404,
  /** P2001: Record to update not found */
  P2001: 404,
  /** P2003: Foreign key constraint failed (referenced ID doesn't exist) */
  P2003: 400,
  /** P2014: A relation violation occurred */
  P2014: 400,
  /** P2015: A related record was not found */
  P2015: 400,
} as const;

/** Error codes that indicate a "not found" scenario */
const NOT_FOUND_CODES = new Set(["P2025", "P2001"]);

/** Error codes that indicate a conflict (duplicate) scenario */
const CONFLICT_CODES = new Set(["P2002"]);

/**
 * Classification of Prisma errors by their semantic meaning
 */
export type PrismaErrorType =
  | "not_found"
  | "conflict"
  | "bad_request"
  | "unknown";

/**
 * Result of translating a Prisma error, with HTTP status and response body
 */
export interface PrismaErrorResult {
  /** Whether the error was a recognized Prisma error */
  mapped: boolean;
  /** Error message safe to return to client */
  message: string;
  /** HTTP status code to return */
  status: number;
  /** Error type classification */
  type: PrismaErrorType;
}

/**
 * Translates a Prisma error to an appropriate HTTP response.
 *
 * @param error - The error caught in a try/catch block
 * @returns A result object with HTTP status, error type, and safe message
 *
 * @example
 * ```typescript
 * try {
 *   await database.user.create({ data });
 * } catch (error) {
 *   if (error instanceof Error) {
 *     const result = translatePrismaError(error);
 *     return NextResponse.json({ message: result.message }, { status: result.status });
 *   }
 *   throw error;
 * }
 * ```
 */
export function translatePrismaError(error: unknown): PrismaErrorResult {
  // Default to 500 for any unhandled error
  const defaultResult: PrismaErrorResult = {
    status: 500,
    type: "unknown",
    mapped: false,
    message: "An unexpected error occurred",
  };

  if (!(error instanceof Error)) {
    return defaultResult;
  }

  // Cast to a generic error with optional code property (Prisma errors have a `code` field)
  type ErrorWithCode = Error & { code?: unknown };
  const prismaError = error as ErrorWithCode;

  // Check if it's a Prisma known request error by checking for the code property
  if (!("code" in prismaError) || typeof prismaError.code !== "string") {
    return defaultResult;
  }

  const code = prismaError.code as string;

  // Check for known Prisma error codes
  type PrismaErrorCode = keyof typeof PRISMA_ERROR_STATUS;
  if (code in PRISMA_ERROR_STATUS) {
    const status = PRISMA_ERROR_STATUS[code as PrismaErrorCode];
    let type: PrismaErrorType;

    if (NOT_FOUND_CODES.has(code as PrismaErrorCode)) {
      type = "not_found";
    } else if (CONFLICT_CODES.has(code as PrismaErrorCode)) {
      type = "conflict";
    } else {
      type = "bad_request";
    }

    // Get a safe message that doesn't leak database schema details
    const message = getSafeErrorMessage(type, code);

    return {
      status,
      type,
      mapped: true,
      message,
    };
  }

  return defaultResult;
}

/**
 * Returns a safe error message that doesn't expose internal database details.
 * The message is appropriate to return to API clients.
 */
function getSafeErrorMessage(type: PrismaErrorType, _code: string): string {
  switch (type) {
    case "not_found":
      return "The requested resource was not found";
    case "conflict":
      return "A record with this value already exists";
    case "bad_request":
      return "The request could not be processed due to a constraint violation";
    default:
      return "An unexpected error occurred";
  }
}

/**
 * Helper to wrap Prisma operations with standardized error handling.
 *
 * @param operation - The async Prisma operation to execute
 * @returns The result of the operation
 * @throws NextResponse with appropriate status if Prisma error occurs
 *
 * @example
 * ```typescript
 * const user = await withPrismaErrorHandling(
 *   database.user.create({ data })
 * );
 * ```
 */
export async function withPrismaErrorHandling<T>(
  operation: Promise<T>
): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    const result = translatePrismaError(error);

    // Return a response-like object that can be used in route handlers
    // The route handler should convert this to an actual NextResponse
    throw new PrismaErrorResponse(result);
  }
}

/**
 * Custom error class for Prisma translation results.
 * Route handlers can catch this to get structured error responses.
 */
export class PrismaErrorResponse extends Error {
  public readonly status: number;
  public readonly type: PrismaErrorType;
  public readonly mapped: boolean;

  constructor(result: PrismaErrorResult) {
    super(result.message);
    this.name = "PrismaErrorResponse";
    this.status = result.status;
    this.type = result.type;
    this.mapped = result.mapped;
  }
}

/**
 * Type guard to check if an error is a PrismaErrorResponse
 */
export function isPrismaErrorResponse(
  error: unknown
): error is PrismaErrorResponse {
  return error instanceof PrismaErrorResponse;
}
