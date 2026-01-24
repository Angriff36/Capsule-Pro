import { ERROR_CODES, SDKError } from "./errors.js";
export class RetryManager {
  maxAttempts;
  initialDelay;
  maxDelay;
  backoffMultiplier;
  retryableErrors;
  onRetry;
  constructor(options = {}) {
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
  async execute(operation, abortSignal) {
    let lastError;
    let attempt = 0;
    while (attempt < this.maxAttempts) {
      try {
        if (abortSignal?.aborted) {
          throw new SDKError("Operation was cancelled", {
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
  isRetryable(error) {
    return error.retryable || this.retryableErrors.has(error.code);
  }
  calculateDelay(attempt) {
    const delay = this.initialDelay * this.backoffMultiplier ** attempt;
    return Math.min(delay, this.maxDelay);
  }
  async delay(ms, abortSignal) {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(
          new SDKError("Operation was cancelled during retry delay", {
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
          new SDKError("Operation was cancelled during retry delay", {
            code: ERROR_CODES.CANCELLATION_FAILED,
            retryable: false,
          })
        );
      });
    });
  }
  ensureSDKError(error) {
    if (error instanceof SDKError) {
      return error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    const sdkError = new SDKError(message, {
      code: ERROR_CODES.INTERNAL_ERROR,
      retryable: false,
    });
    if (stack) {
      sdkError.stack = stack;
    }
    return sdkError;
  }
}
