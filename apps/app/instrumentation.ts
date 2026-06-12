export async function register() {
  // Sentry + import-in-the-middle conflict with Turbopack HMR (vercel/next.js#70424).
  if (process.env.NODE_ENV === "development") {
    return;
  }

  const hasSentryDsn = Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  );

  if (!hasSentryDsn) {
    return;
  }

  // Next sets NEXT_RUNTIME to 'nodejs' or 'edge'
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = (
  error: Error & { digest?: string },
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[]>;
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware" | "proxy";
  }
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    import("./instrumentation.node")
      .then(({ logAppRequestError }) => {
        logAppRequestError(error, request, context);
      })
      .catch(() => {
        /* manifest issue log is best-effort in dev */
      });
  }
  if (process.env.NODE_ENV === "development") {
    return;
  }

  return import("@sentry/nextjs").then(({ captureRequestError }) =>
    captureRequestError(error, request, context)
  );
};
