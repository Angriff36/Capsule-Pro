import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = (
  error: Error & { digest?: string },
  request: { path: string; method: string; headers: Record<string, string | string[]> },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware" | "proxy";
  }
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    void import("./instrumentation.node").then(({ logApiRequestError }) => {
      logApiRequestError(error, request, context);
    });
  }
  return Sentry.captureRequestError(error, request, context);
};