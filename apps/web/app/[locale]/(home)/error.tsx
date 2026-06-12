"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

interface ErrorProperties {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/**
 * Next.js throws NEXT_HTTP_ERROR_FALLBACK;<status> for expected HTTP errors
 * (404, 401, 403). These are not real exceptions — skip Sentry reporting.
 */
function isNextHTTPErrorFallback(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
  );
}

/**
 * Error boundary for the home page route.
 * Catches locale-related errors and other runtime errors gracefully.
 */
const Error = ({ error, reset }: ErrorProperties) => {
  useEffect(() => {
    if (isNextHTTPErrorFallback(error)) {
      return;
    }
    // Log to Sentry with additional context
    captureException(error, {
      tags: {
        route: "home",
        possibleCause: error.message?.includes("locale")
          ? "locale-error"
          : "unknown",
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-semibold text-2xl">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        We encountered an unexpected error. Please try again or contact support
        if the problem persists.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()} variant="default">
          Try again
        </Button>
        <Button
          onClick={() => (window.location.href = "/en")}
          variant="outline"
        >
          Go to home
        </Button>
      </div>
    </div>
  );
};

export default Error;
