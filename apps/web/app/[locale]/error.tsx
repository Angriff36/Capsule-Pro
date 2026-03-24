"use client";

import { useEffect } from "react";

interface LocaleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for the [locale] route.
 * Catches RangeError from Intl APIs and other locale-related errors.
 */
export default function LocaleError({ error, reset }: LocaleErrorProps) {
  useEffect(() => {
    // Log locale-related errors for debugging
    console.error("[Locale Error]", {
      message: error.message,
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  // Check if this is a locale-related RangeError
  const isLocaleError =
    error instanceof RangeError ||
    error.message?.includes("locale") ||
    error.message?.includes("Intl");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 font-bold text-2xl tracking-tight">
          {isLocaleError ? "Invalid Locale" : "Something went wrong"}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {isLocaleError
            ? "The requested locale is not supported. Redirecting to English..."
            : "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={() => {
            if (isLocaleError) {
              window.location.href = "/en";
            } else {
              reset();
            }
          }}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-sm text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {isLocaleError ? "Go to Home" : "Try Again"}
        </button>
      </div>
    </div>
  );
}
