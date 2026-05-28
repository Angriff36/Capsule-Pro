import "server-only";

import type { ManifestIssueKind } from "@repo/observability/manifest-issue-log";
import {
  inferAppSource,
  logManifestIssue,
} from "@repo/observability/manifest-issue-log";

type RequestErrorContext = {
  routeType?: string;
  routePath?: string;
};

type RequestErrorRequest = {
  path: string;
  method: string;
};

/** Log Next.js request/server-action failures to the manifest issue log (dev). */
export function logRequestErrorToManifestIssueLog(
  error: Error & { digest?: string },
  request: RequestErrorRequest,
  context: RequestErrorContext
): void {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.MANIFEST_ISSUE_LOG === "0"
  ) {
    return;
  }

  const kind: ManifestIssueKind =
    context.routeType === "action" ? "server_action_error" : "request_error";

  logManifestIssue({
    kind,
    source: inferAppSource(),
    message: error.message,
    httpStatus: 500,
    details: {
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      digest: error.digest,
      stack: error.stack,
    },
  });
}
