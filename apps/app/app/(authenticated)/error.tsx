"use client";

import { useEffect } from "react";

const DB_ERROR_PATTERN =
  /database|connection terminated|connection refused|ECONNREFUSED|DATABASE_URL/i;

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error?.message ?? "Something went wrong";
  const isDbError = DB_ERROR_PATTERN.test(message);

  useEffect(() => {
    // Log so devs see it in server logs too
    console.error("[AuthenticatedError]", message);
  }, [message]);

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
