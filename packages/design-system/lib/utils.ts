import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Extract a user-friendly message from an unknown error.
 * This is a lightweight client-safe version that does NOT import server observability.
 * For server-side error logging with Sentry, use `parseError` from `@repo/observability/error`.
 */
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return String(error) || "An error occurred";
};

export const handleError = (error: unknown): void => {
  const message = extractErrorMessage(error);
  toast.error(message);
};
