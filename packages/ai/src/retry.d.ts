import { type ErrorCode, SDKError } from "./errors.js";
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: ErrorCode[];
  onRetry?: (attempt: number, error: SDKError) => void;
}
export declare class RetryManager {
  private readonly maxAttempts;
  private readonly initialDelay;
  private readonly maxDelay;
  private readonly backoffMultiplier;
  private readonly retryableErrors;
  private readonly onRetry?;
  constructor(options?: RetryOptions);
  execute<T>(
    operation: () => Promise<T>,
    abortSignal?: AbortSignal
  ): Promise<T>;
  private isRetryable;
  private calculateDelay;
  private delay;
  private ensureSDKError;
}
//# sourceMappingURL=retry.d.ts.map
