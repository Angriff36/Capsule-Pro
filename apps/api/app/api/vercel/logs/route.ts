/**
 * @module VercelLogIngestion
 * @intent Receive and process logs from Vercel Log Drains
 * @responsibility Ingest external logs into the observability pipeline
 * @domain Infrastructure
 * @tags vercel, logs, observability, ingestion
 * @canonical true
 */

import { log } from "@repo/observability/log";
import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Environment configuration for Vercel Log Drain verification
 */
const VERCEL_DRAIN_SECRET = process.env.VERCEL_DRAIN_SIGNATURE_SECRET;

/**
 * Vercel Log Drain payload structure
 * @see https://vercel.com/docs/log-drains
 */
interface VercelLogPayload {
  branch?: string;
  buildId?: string;
  deploymentId: string;
  destination?: string;
  edgeType?: string;
  entrypoint?: string;
  environment?: string;
  executionRegion?: string;
  host: string;
  id: string;
  level: "info" | "warning" | "error";
  message?: string;
  path?: string;
  projectId: string;
  projectName?: string;
  requestId?: string;
  source: string;
  span?: {
    id?: string;
  };
  spanId?: string;
  statusCode?: number;
  timestamp: number;
  /**
   * Nested trace/span objects (Vercel format)
   */
  trace?: {
    id?: string;
  };
  traceId?: string;
  type?: string;
  /**
   * Additional structured data from Vercel
   */
  [key: string]: unknown;
}

/**
 * Valid source values per Vercel documentation
 */
const VALID_SOURCES = [
  "build",
  "edge",
  "function",
  "lambda",
  "static",
  "external",
] as const;

/**
 * Valid level values per Vercel documentation
 */
const VALID_LEVELS = ["info", "warning", "error"] as const;

/**
 * Verify HMAC-SHA1 signature from x-vercel-signature header
 * @param rawBody - The raw request body as string
 * @param signature - The signature from x-vercel-signature header
 * @returns true if signature is valid, false otherwise
 */
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!(VERCEL_DRAIN_SECRET && signature)) {
    return false;
  }

  try {
    const hmac = createHmac("sha1", VERCEL_DRAIN_SECRET);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("hex");
    return signature === expectedSignature;
  } catch {
    return false;
  }
}

/**
 * Validate that the payload has required fields per Vercel schema
 */
function validateLogPayload(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  const payload = data as Record<string, unknown>;

  // Required fields
  if (typeof payload.id !== "string") {
    errors.push("id is required and must be a string");
  }

  if (typeof payload.deploymentId !== "string") {
    errors.push("deploymentId is required and must be a string");
  }

  if (typeof payload.source !== "string") {
    errors.push("source is required and must be a string");
  } else if (!(VALID_SOURCES as readonly string[]).includes(payload.source)) {
    errors.push(`source must be one of: ${VALID_SOURCES.join(", ")}`);
  }

  if (typeof payload.host !== "string") {
    errors.push("host is required and must be a string");
  }

  if (typeof payload.timestamp !== "number") {
    errors.push("timestamp is required and must be a number");
  }

  if (typeof payload.projectId !== "string") {
    errors.push("projectId is required and must be a string");
  }

  if (typeof payload.level !== "string") {
    errors.push("level is required and must be a string");
  } else if (!(VALID_LEVELS as readonly string[]).includes(payload.level)) {
    errors.push(`level must be one of: ${VALID_LEVELS.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Map Vercel log level to structured log format
 */
function getLogLevel(level: string): "info" | "warn" | "error" | "debug" {
  if (level === "warning") {
    return "warn";
  }
  if ((VALID_LEVELS as readonly string[]).includes(level)) {
    return level === "warning" ? "warn" : (level as "info" | "warn" | "error");
  }
  return "info";
}

/**
 * Process a single log entry asynchronously
 */
function processLogEntry(payload: VercelLogPayload): void {
  const {
    id,
    deploymentId,
    source,
    host,
    timestamp,
    projectId,
    level,
    message,
    requestId,
    traceId,
    spanId,
    ...rest
  } = payload;

  const structuredData = {
    vercel: {
      id,
      deploymentId,
      source,
      host,
      projectId,
      requestId,
      traceId,
      spanId,
    },
    timestamp: new Date(timestamp).toISOString(),
    ...rest,
  };

  const logLevel = getLogLevel(level);
  const logMessage = message ?? `[Vercel ${source}] ${id}`;

  switch (logLevel) {
    case "error":
      log.error(logMessage, structuredData);
      break;
    case "warn":
      log.warn(logMessage, structuredData);
      break;
    case "debug":
      log.debug?.(logMessage, structuredData);
      break;
    default:
      log.info(logMessage, structuredData);
  }
}

/**
 * Process log entries in batch
 */
function processLogBatch(payloads: VercelLogPayload[]): void {
  for (const payload of payloads) {
    try {
      processLogEntry(payload);
    } catch (error) {
      log.error("Failed to process log entry", {
        error: error instanceof Error ? error.message : "Unknown error",
        payload,
      });
    }
  }
}

/**
 * POST /api/vercel/logs
 * Receive logs from Vercel Log Drains
 *
 * Accepts either a single log object or an array of logs.
 * Validates required fields and verifies HMAC-SHA1 signature.
 * Processing is deferred via microtask to return response quickly.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Get raw body for signature verification
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { message: "Failed to read request body" },
      { status: 400 }
    );
  }

  // Verify signature
  const signature = request.headers.get("x-vercel-signature");
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { message: "Invalid or missing signature" },
      { status: 401 }
    );
  }

  // Parse JSON
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // Handle both single log and batch array
  const payloads = Array.isArray(body) ? body : [body];
  const validPayloads: VercelLogPayload[] = [];
  const validationErrors: Array<{ index: number; errors: string[] }> = [];

  for (let i = 0; i < payloads.length; i++) {
    const { valid, errors } = validateLogPayload(payloads[i]);
    if (valid) {
      validPayloads.push(payloads[i] as VercelLogPayload);
    } else {
      validationErrors.push({ index: i, errors });
    }
  }

  // If no valid payloads, return error
  if (validPayloads.length === 0) {
    return NextResponse.json(
      {
        message: "No valid log payloads",
        errors: validationErrors,
      },
      { status: 400 }
    );
  }

  // Defer processing via microtask to return response quickly
  Promise.resolve().then(() => {
    processLogBatch(validPayloads);
  });

  // Return success immediately
  return NextResponse.json({
    received: validPayloads.length,
    rejected: validationErrors.length,
    ...(validationErrors.length > 0 && { validationErrors }),
  });
}
