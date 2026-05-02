"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { fonts } from "@/lib/fonts";
import { captureException } from "@sentry/nextjs";
import type NextError from "next/error";
import { useEffect } from "react";

interface GlobalErrorProperties {
  readonly error: NextError & { digest?: string };
  readonly reset: () => void;
}

/**
 * Next.js throws NEXT_HTTP_ERROR_FALLBACK;<status> for expected HTTP errors
 * (404, 401, 403). These are not real exceptions — they're normal responses
 * that should NOT be reported to Sentry.
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
    if (isNextHTTPErrorFallback(error)) return;
    captureException(error);
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
