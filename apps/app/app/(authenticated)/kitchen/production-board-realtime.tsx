"use client";

import Ably from "ably";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
// biome-ignore lint/performance/noBarrelFile: Sentry requires namespace import for logger
import * as Sentry from "@sentry/nextjs";

const { logger, captureException } = Sentry;

interface ProductionBoardRealtimeProps {
  tenantId: string;
  userId?: string | null;
}

const authUrl = "/ably/auth";

const isKitchenTaskEvent = (eventName?: string) =>
  eventName?.startsWith("kitchen.task.") ?? false;

export function ProductionBoardRealtime({
  tenantId,
  userId,
}: ProductionBoardRealtimeProps) {
  const router = useRouter();
  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    let isMounted = true;

    // Verify the auth endpoint exists before initializing Ably
    const initializeConnection = async () => {
      try {
        // Test if the auth endpoint is available
        const testResponse = await fetch(authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tenantId }),
        }).catch(() => null);

        if (!testResponse?.ok) {
          // Auth endpoint not available, skip real-time connection
          if (process.env.NODE_ENV === "development") {
            logger.warn(
              "[ProductionBoardRealtime] Auth endpoint not available, skipping real-time connection"
            );
          }
          return;
        }

        if (!isMounted) {
          return;
        }

        const client = new Ably.Realtime({
          authCallback: async (_, callback) => {
            try {
              const response = await fetch(authUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ tenantId }),
              });
              if (!response.ok) {
                throw new Error(`Ably auth failed: ${response.status}`);
              }
              const tokenRequest = await response.json();
              callback(null, tokenRequest);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Ably auth failed.";
              // Log error but don't break the app
              if (process.env.NODE_ENV === "development") {
                logger.warn(
                  logger.fmt`[ProductionBoardRealtime] Auth error: ${message}`
                );
              }
              callback(message, null);
            }
          },
        });

        // Handle connection errors gracefully - suppress error propagation
        client.connection.on((stateChange) => {
          if (!isMounted) {
            return;
          }

          const { current, reason, retryIn } = stateChange;

          // Suppress connection errors - real-time is optional
          if (
            current === "failed" ||
            current === "suspended" ||
            current === "disconnected" ||
            current === "closed"
          ) {
            // Connection failed, but we'll continue without real-time updates
            // Don't log or propagate these errors
            return;
          }

          // Only log non-error states in development
          if (process.env.NODE_ENV === "development" && reason) {
            console.debug(
              `[ProductionBoardRealtime] Connection state: ${current}`,
              { reason, retryIn }
            );
          }
        });

        clientRef.current = client;

        const channel = client.channels.get(`tenant:${tenantId}`);
        channelRef.current = channel;

        const handleMessage = (message: { name?: string }) => {
          if (!isMounted) {
            return;
          }
          if (!isKitchenTaskEvent(message.name)) {
            return;
          }
          router.refresh();
        };

        // Subscribe with error handling
        try {
          channel.subscribe(handleMessage);
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            logger.warn(
              logger.fmt`[ProductionBoardRealtime] Subscription error: ${String(error)}`
            );
          }
        }
      } catch (error) {
        // If Ably initialization fails, fail silently
        if (process.env.NODE_ENV === "development") {
          logger.warn(
            logger.fmt`[ProductionBoardRealtime] Initialization error: ${String(error)}`
          );
        }
      }
    };

    // Initialize connection asynchronously
    initializeConnection().catch((error) => {
      if (process.env.NODE_ENV === "development") {
        logger.warn(
          logger.fmt`[ProductionBoardRealtime] Connection initialization failed: ${String(error)}`
        );
      }
    });

    return () => {
      isMounted = false;
      try {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
        }
        // Note: We don't close the client here because:
        // 1. Multiple components may share the same connection
        // 2. The connection lifecycle should be managed at the app level
        // 3. Closing and recreating connections causes "Connection closed" errors
      } catch (error) {
        // Ignore cleanup errors
        if (process.env.NODE_ENV === "development") {
          logger.warn(
            logger.fmt`[ProductionBoardRealtime] Cleanup error: ${String(error)}`
          );
        }
      }
    };
  }, [tenantId, router]);

  return null;
}

