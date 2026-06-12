"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { captureException } from "@sentry/nextjs";
import type NextError from "next/error";
import { posthog } from "posthog-js";
import { useEffect } from "react";
import { fonts } from "@/lib/fonts";

interface GlobalErrorProperties {
  readonly error: NextError & { digest?: string };
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

const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
  useEffect(() => {
    if (isNextHTTPErrorFallback(error)) {
      return;
    }
    captureException(error);
    posthog?.capture("error:boundary_triggered", {
      error_message: String(
        error instanceof Error ? error.message : String(error)
      ).slice(0, 200),
    });
  }, [error]);

  return (
    <html className={fonts} lang="en">
      <body>
        <h1>Oops, something went wrong</h1>
        <Button onClick={() => reset()}>Try again</Button>
      </body>
    </html>
  );
};

export default GlobalError;
