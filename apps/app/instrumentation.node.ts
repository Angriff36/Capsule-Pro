import "server-only";

import { logRequestErrorToManifestIssueLog } from "@repo/observability/request-error-log";

type RequestErrorContext = {
  routerKind: "Pages Router" | "App Router";
  routePath: string;
  routeType: "render" | "route" | "action" | "middleware" | "proxy";
};

type RequestErrorRequest = {
  path: string;
  method: string;
  headers: Record<string, string | string[]>;
};

/** Node-only manifest issue logging (must not be statically imported from instrumentation.ts). */
export function logAppRequestError(
  error: Error & { digest?: string },
  request: RequestErrorRequest,
  context: RequestErrorContext
): void {
  logRequestErrorToManifestIssueLog(error, request, context);
}
