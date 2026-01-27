import {
  createSDKError,
  ERROR_CODES,
  type ErrorCode,
  SDKError,
} from "./errors.js";

export type RetryOptions = {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: ErrorCode[];
  onRetry?: (attempt: number, error: SDKError) => void;
};

export class RetryManager {
  private readonly maxAttempts: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly backoffMultiplier: number;
  private readonly retryableErrors: Set<ErrorCode>;
  private readonly onRetry?: (attempt: number, error: SDKError) => void;

  constructor(options: RetryOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.initialDelay = options.initialDelay ?? 1000;
    this.maxDelay = options.maxDelay ?? 30_000;
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
    this.retryableErrors = new Set(
      options.retryableErrors ?? [
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        ERROR_CODES.TIMEOUT,
        ERROR_CODES.TOOL_EXECUTION_FAILED,
        ERROR_CODES.AUTH_EXPIRED,
      ]
    );
    this.onRetry = options.onRetry;
  }

  async execute<T>(
    operation: () => Promise<T>,
    abortSignal?: AbortSignal
  ): Promise<T> {
    let lastError: SDKError | undefined;
    let attempt = 0;

    while (attempt < this.maxAttempts) {
      try {
        if (abortSignal?.aborted) {
          throw createSDKError("Operation was cancelled", {
            code: ERROR_CODES.CANCELLATION_FAILED,
            retryable: false,
          });
        }
        return await operation();
      } catch (error) {
        const sdkError = this.ensureSDKError(error);
        lastError = sdkError;

        if (!this.isRetryable(sdkError) || attempt >= this.maxAttempts - 1) {
          throw sdkError;
        }

        const delay = this.calculateDelay(attempt);

        if (this.onRetry) {
          this.onRetry(attempt + 1, sdkError);
        }

        await this.delay(delay, abortSignal);
        attempt++;
      }
    }

    throw lastError;
  }

  private isRetryable(error: SDKError): boolean {
    return error.retryable || this.retryableErrors.has(error.code);
  }

  private calculateDelay(attempt: number): number {
    const delay = this.initialDelay * this.backoffMultiplier ** attempt;
    return Math.min(delay, this.maxDelay);
  }

  private async delay(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(
          createSDKError("Operation was cancelled during retry delay", {
            code: ERROR_CODES.CANCELLATION_FAILED,
            retryable: false,
          })
        );
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      abortSignal?.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(
          createSDKError("Operation was cancelled during retry delay", {
            code: ERROR_CODES.CANCELLATION_FAILED,
            retryable: false,
          })
        );
      });
    });
  }

  private ensureSDKError(error: unknown): SDKError {
    if (error instanceof SDKError) {
      return error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;

    const sdkError = createSDKError(message, {
      code: ERROR_CODES.INTERNAL_ERROR,
      retryable: false,
    });

    if (stack) {
      sdkError.stack = stack;
    }

    return sdkError;
  }
}
