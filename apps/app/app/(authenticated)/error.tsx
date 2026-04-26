"use client";

import { captureException } from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

// Match actual connection/infrastructure errors — NOT application-level messages
// that happen to contain "database" (e.g. "User not found in database").
const DB_ERROR_PATTERN =
  /connection terminated|connection refused|ECONNREFUSED|ENOTFOUND|DATABASE_URL|Database connection failed/i;

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

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const posthog = usePostHog();
  const message = error?.message ?? "Something went wrong";
  const isDbError = DB_ERROR_PATTERN.test(message);

  useEffect(() => {
    if (isNextHTTPErrorFallback(error)) return;
    console.error("[AuthenticatedError]", message);
    captureException(error, {
      tags: {
        route: "authenticated",
        errorType: isDbError ? "database_connection" : "runtime",
      },
      extra: { digest: error.digest },
    });

    // PostHog error tracking
    posthog?.capture("error:boundary_triggered", {
      error_message: message.slice(0, 200),
    });
  }, [error, message, isDbError, posthog]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <div className="w-full max-w-md rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
        <h2 className="font-semibold text-destructive">
          {isDbError ? "Database unavailable" : "Something went wrong"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {isDbError && (
          <p className="mt-2 text-muted-foreground text-xs">
            Neon: use the <strong>pooled</strong> connection string from the
            dashboard (Connection string → Pooled) and ensure the project is not
            paused. Other DBs: check DATABASE_URL in .env.local.
          </p>
        )}
        <button
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
