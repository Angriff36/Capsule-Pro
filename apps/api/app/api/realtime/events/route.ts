/**
 * SSE realtime endpoint — apps/api
 *
 * Replaces the Ably Realtime browser connection. Browser clients open an
 * `EventSource` against this endpoint with a list of channels to subscribe
 * to (always scoped to the caller's tenant). The handler authenticates via
 * Clerk, registers a listener on the in-process pub/sub, and streams every
 * matching message as a Server-Sent Event.
 *
 * Docs:
 *   - Next.js Route Handlers (streaming):
 *     https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 *   - MDN — Server-Sent Events / EventSource:
 *     https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
 *   - Clerk auth() helper:
 *     https://clerk.com/docs/references/nextjs/auth
 *
 * Request:
 *   GET /api/realtime/events?channel=tenant:{tenantId}[&channel=tenant:{tenantId}:admin-chat&...]
 *
 *   - Every requested channel must start with the caller's `tenant:{tenantId}`
 *     prefix; cross-tenant subscriptions are rejected with 403.
 *   - Cookies (Clerk session) are sent automatically because the browser
 *     reaches this route through the apps/app Next rewrite (same-origin)
 *     or with `withCredentials: true` and matching CORS headers.
 *
 * Response:
 *   text/event-stream stream. Each delivered pub/sub message becomes one
 *   SSE event:
 *     event: <message.name>
 *     data:  {"channel":"<channel>","name":"<message.name>","data":<payload>}
 *
 *   A keep-alive comment (`: ping`) is emitted every 25s so proxies do not
 *   close idle connections.
 */

import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/app/lib/cors";
import { getTenantEventBus } from "@/lib/manifest/event-bus";
import { type RealtimeMessage, subscribeMany } from "@/lib/realtime/pubsub";

export const runtime = "nodejs";
// Disable response caching — this is a long-lived stream, not a cacheable resource.
export const dynamic = "force-dynamic";

const KEEP_ALIVE_INTERVAL_MS = 25_000;
const ENCODER = new TextEncoder();

function formatSseEvent(channel: string, message: RealtimeMessage): string {
  const json = JSON.stringify({
    channel,
    name: message.name,
    data: message.data,
  });
  // No `event:` line — we keep everything as the default `message` event so a
  // single `EventSource.onmessage` / `addEventListener("message", ...)` on the
  // client side sees every delivery. Clients filter by `name` from the JSON
  // payload. (Per the SSE spec, when `event:` is set the browser dispatches a
  // typed event instead of `message`, which forced clients to enumerate every
  // possible event name in advance.)
  return `data: ${json}\n\n`;
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request, "GET, OPTIONS"),
  });
}

export async function GET(request: Request) {
  const { userId, sessionClaims } = await auth();
  const cors = corsHeaders(request, "GET, OPTIONS");

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: cors }
    );
  }

  const tenantId = (sessionClaims?.tenantId as string | undefined) ?? null;
  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId session claim is required" },
      { status: 400, headers: cors }
    );
  }

  const url = new URL(request.url);
  const requestedChannels = url.searchParams.getAll("channel");
  const channels =
    requestedChannels.length > 0 ? requestedChannels : [`tenant:${tenantId}`];

  const tenantPrefix = `tenant:${tenantId}`;
  for (const channel of channels) {
    if (channel !== tenantPrefix && !channel.startsWith(`${tenantPrefix}:`)) {
      return NextResponse.json(
        { error: `channel "${channel}" not allowed for this tenant` },
        { status: 403, headers: cors }
      );
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) {
          return;
        }
        try {
          controller.enqueue(ENCODER.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Initial comment so the client knows the connection is alive even
      // before the first event arrives.
      safeEnqueue(": connected\n\n");

      const unsubscribe = subscribeMany(channels, (channel, message) => {
        safeEnqueue(formatSseEvent(channel, message));
      });

      // Cross-instance leg (Phase 6): engine event batches published to the
      // tenant's Redis channel by OTHER instances stream into this SSE
      // connection too. No-op when REDIS_URL is unset — in-process pub/sub +
      // the outbox cron remain the only delivery paths, as before.
      let busUnsubscribe: (() => Promise<void>) | undefined;
      const bus = getTenantEventBus(tenantId);
      if (bus) {
        bus
          .subscribe((message) => {
            for (const event of message.events) {
              safeEnqueue(
                formatSseEvent(tenantPrefix, {
                  name: event.channel || event.name,
                  data: event,
                })
              );
            }
          })
          .then((unsub) => {
            busUnsubscribe = unsub;
            if (closed) {
              // Stream ended while the subscriber connection was opening.
              void unsub().catch(() => {});
            }
          })
          .catch(() => {
            // Redis unavailable — SSE continues on the in-process paths.
          });
      }

      const keepAlive = setInterval(() => {
        safeEnqueue(": ping\n\n");
      }, KEEP_ALIVE_INTERVAL_MS);

      const cleanup = () => {
        if (closed) {
          return;
        }
        closed = true;
        clearInterval(keepAlive);
        unsubscribe();
        if (busUnsubscribe) {
          void busUnsubscribe().catch(() => {});
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // The browser closing the connection triggers AbortSignal.
      request.signal.addEventListener("abort", cleanup, { once: true });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Nginx/Vercel buffering so events flush immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
