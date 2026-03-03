"use server";

/**
 * Retry utilities for board actions.
 * Provides automatic retry logic for transient failures like network errors.
 */

/** Configuration for retry behavior */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 1) */
  maxRetries: number;
  /** Delay in milliseconds between retries (default: 2000) */
  delayMs: number;
  /** Whether to retry on specific error conditions */
  shouldRetry?: (error: unknown) => boolean;
}

/** Default retry configuration: 1 retry with 2s delay */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 1,
  delayMs: 2000,
};

/**
 * Determines if an error is retryable (transient failure).
 * Network errors, timeouts, and 5xx status codes are considered retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Network errors (fetch failed, ECONNREFUSED, etc.)
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("etimedout") ||
      message.includes("socket hang up")
    ) {
      return true;
    }
  }

  // Error objects with status codes
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Timeout errors
    if (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("etag")
    ) {
      return true;
    }

    // Database connection errors
    if (
      message.includes("connection") &&
      (message.includes("lost") || message.includes("reset") || message.includes("refused"))
    ) {
      return true;
    }
  }

  // Check for status property on error-like objects
  const errorWithStatus = error as { status?: number; statusCode?: number };
  const status = errorWithStatus.status ?? errorWithStatus.statusCode;
  if (typeof status === "number") {
    // Retry on 5xx server errors and 429 rate limiting
    return status >= 500 || status === 429 || status === 408;
  }

  return false;
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps an async function with retry logic.
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns The result of the function or throws after all retries are exhausted
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => database.boardProjection.findMany(...),
 *   { maxRetries: 1, delayMs: 2000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, delayMs, shouldRetry } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  const retryPredicate = shouldRetry ?? isRetryableError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Log retry attempt
      if (attempt < maxRetries && retryPredicate(error)) {
        console.warn(
          `[withRetry] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`,
          error instanceof Error ? error.message : error
        );
        await sleep(delayMs);
      } else {
        // Non-retryable error or max retries reached
        break;
      }
    }
  }

  // All retries exhausted or non-retryable error
  throw lastError;
}

/**
 * Wraps an async operation with retry logic and returns a result object.
 * Useful for server actions that should return { success, error } objects.
 *
 * @param fn - The async function to execute
 * @param context - Context string for error logging
 * @param config - Retry configuration
 * @returns A result object with success/error
 *
 * @example
 * ```ts
 * const result = await withRetryResult(
 *   async () => {
 *     const board = await database.commandBoard.create(...);
 *     return { board };
 *   },
 *   "createCommandBoard"
 * );
 * // result: { success: true, board } | { success: false, error }
 * ```
 */
export async function withRetryResult<T>(
  fn: () => Promise<T>,
  context: string,
  config: Partial<RetryConfig> = {}
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await withRetry(fn, config);
    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    console.error(`[${context}] Operation failed:`, {
      error: errorMessage,
      retryable: isRetryableError(error),
    });

    return { success: false, error: errorMessage };
  }
}
