import { log } from "@repo/observability/log";
import {
  CAPSULE_SENTRY_CANARY_FINGERPRINT,
  pipelineLogFields,
} from "@repo/sentry-integration/pipeline-correlation";
import { captureException, flush } from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Controlled canary: sends one identifiable error to Sentry with a shared log prefix.
 * Requires CAPSULE_SENTRY_CANARY_SECRET; Authorization: Bearer <secret> or ?secret=
 */
export const GET = async (request: Request): Promise<Response> => {
  const configuredSecret = process.env.CAPSULE_SENTRY_CANARY_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { ok: false, error: "CAPSULE_SENTRY_CANARY_SECRET not set" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const qSecret = url.searchParams.get("secret");
  if (auth !== `Bearer ${configuredSecret}` && qSecret !== configuredSecret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_SENTRY_DSN not set" },
      { status: 503 }
    );
  }

  const err = new Error(CAPSULE_SENTRY_CANARY_FINGERPRINT);
  const correlationId = `canary:${crypto.randomUUID()}`;

  log.info(
    "[SentryCanary] Emitting canary exception",
    pipelineLogFields("sentry_canary_emit", correlationId, {
      fingerprint: CAPSULE_SENTRY_CANARY_FINGERPRINT,
    })
  );

  captureException(err, {
    tags: {
      capsule_canary: "true",
      capsule_pipeline: "e2e_verify",
    },
    level: "error",
  });

  await flush(2000);

  return NextResponse.json({
    ok: true,
    pipeline_correlation_id: correlationId,
    fingerprint: CAPSULE_SENTRY_CANARY_FINGERPRINT,
    message: "Exception captured and flushed via Sentry SDK",
  });
};
