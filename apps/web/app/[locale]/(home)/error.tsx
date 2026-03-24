"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

interface ErrorProperties {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/**
 * Error boundary for the home page route.
 * Catches locale-related errors and other runtime errors gracefully.
 */
const Error = ({ error, reset }: ErrorProperties) => {
  useEffect(() => {
    // Log to Sentry with additional context
    captureException(error, {
      tags: {
        route: "home",
        possibleCause: error.message?.includes("locale") ? "locale-error" : "unknown",
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md">
        We encountered an unexpected error. Please try again or contact support if the problem persists.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()} variant="default">
          Try again
        </Button>
        <Button onClick={() => (window.location.href = "/en")} variant="outline">
          Go to home
        </Button>
      </div>
    </div>
  );
};

export default Error;
