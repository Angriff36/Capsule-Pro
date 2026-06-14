import {
  SentryIssueAlertSchema
} from "./chunk-CVVP5YMS.js";

// src/webhook.ts
import { createHmac, timingSafeEqual } from "crypto";
var verifySentrySignature = (body, signature, secret) => {
  if (!(body && signature && secret)) {
    return false;
  }
  const hmac = createHmac("sha256", secret);
  hmac.update(body, "utf8");
  const digest = hmac.digest("hex");
  try {
    const digestBuffer = Buffer.from(digest, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");
    if (digestBuffer.length !== signatureBuffer.length) {
      return false;
    }
    return timingSafeEqual(digestBuffer, signatureBuffer);
  } catch {
    return digest === signature;
  }
};
var parseSentryWebhookPayload = (payload) => SentryIssueAlertSchema.parse(payload);
var extractSlugsFromUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const orgIndex = pathParts.indexOf("organizations");
    if (orgIndex !== -1 && orgIndex + 1 < pathParts.length) {
      const organizationSlug = pathParts[orgIndex + 1];
      const projectIndex = pathParts.indexOf("projects");
      const projectSlug = projectIndex !== -1 && projectIndex + 1 < pathParts.length ? pathParts[projectIndex + 1] : "default";
      return { organizationSlug, projectSlug };
    }
    if (pathParts.length >= 2) {
      return {
        organizationSlug: pathParts[0],
        projectSlug: pathParts[1]
      };
    }
    return { organizationSlug: "unknown", projectSlug: "unknown" };
  } catch {
    return { organizationSlug: "unknown", projectSlug: "unknown" };
  }
};
var parseSentryIssue = (payload) => {
  const { data } = payload;
  const { event } = data;
  const { organizationSlug, projectSlug } = extractSlugsFromUrl(event.web_url);
  const stackFrames = event.exception?.values?.[0]?.stacktrace?.frames?.map((frame) => ({
    filename: frame.filename ?? null,
    function: frame.function ?? null,
    line: frame.lineno ?? null,
    column: frame.colno ?? null,
    absPath: frame.abs_path ?? null
  })).reverse() ?? null;
  const firstException = event.exception?.values?.[0];
  return {
    issueId: event.issue_id,
    eventId: event.event_id ?? null,
    organizationSlug,
    projectSlug: event.project_slug ?? projectSlug,
    environment: event.environment ?? null,
    release: event.release ?? null,
    title: event.title ?? data.triggered_rule ?? "Unknown Error",
    message: event.message ?? null,
    culprit: event.culprit ?? null,
    issueUrl: event.issue_url,
    webUrl: event.web_url,
    exceptionType: firstException?.type ?? null,
    exceptionValue: firstException?.value ?? null,
    stackFrames,
    tags: event.tags ?? {},
    rawPayload: payload
  };
};
var isIssueAlertWebhook = (resourceHeader) => resourceHeader === "event_alert";
var extractSentryHeaders = (headers) => ({
  sentryHookSignature: headers.get("sentry-hook-signature"),
  sentryHookTimestamp: headers.get("sentry-hook-timestamp"),
  sentryHookResource: headers.get("sentry-hook-resource"),
  requestId: headers.get("request-id")
});

export {
  verifySentrySignature,
  parseSentryWebhookPayload,
  parseSentryIssue,
  isIssueAlertWebhook,
  extractSentryHeaders
};
//# sourceMappingURL=chunk-W3ASZR3B.js.map