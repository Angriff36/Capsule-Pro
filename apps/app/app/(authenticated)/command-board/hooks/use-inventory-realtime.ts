"use client";

import * as Sentry from "@sentry/nextjs";
import Ably from "ably";
import { useEffect, useRef } from "react";

const { logger } = Sentry;

const authUrl = "/ably/auth";

const isInventoryStockEvent = (eventName?: string) =>
  eventName?.startsWith("inventory.stock.") ?? false;

interface InventoryStockPayload {
  stockItemId: string;
  newQuantity: number;
  previousQuantity: number;
}

interface UseInventoryRealtimeProps {
  tenantId: string;
  onInventoryUpdate?: (payload: InventoryStockPayload) => void;
}

/**
 * Hook to subscribe to real-time inventory stock events.
 * Calls onInventoryUpdate callback when inventory quantities change.
 */
export function useInventoryRealtime({
  tenantId,
  onInventoryUpdate,
}: UseInventoryRealtimeProps) {
  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const onInventoryUpdateRef = useRef(onInventoryUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onInventoryUpdateRef.current = onInventoryUpdate;
  }, [onInventoryUpdate]);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    let isMounted = true;

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
          if (process.env.NODE_ENV === "development") {
            logger.warn(
              "[useInventoryRealtime] Auth endpoint not available, skipping real-time connection"
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
              if (process.env.NODE_ENV === "development") {
                logger.warn(
                  logger.fmt`[useInventoryRealtime] Auth error: ${message}`
                );
              }
              callback(message, null);
            }
          },
        });

        // Handle connection errors gracefully
        client.connection.on((stateChange) => {
          if (!isMounted) {
            return;
          }

          const { current, reason, retryIn } = stateChange;

          if (
            current === "failed" ||
            current === "suspended" ||
            current === "disconnected" ||
            current === "closed"
          ) {
            return;
          }

          if (process.env.NODE_ENV === "development" && reason) {
            logger.info(
              logger.fmt`[useInventoryRealtime] Connection state: ${current}`,
              { reason, retryIn }
            );
          }
        });

        clientRef.current = client;

        const channel = client.channels.get(`tenant:${tenantId}`);
        channelRef.current = channel;

        const handleMessage = (message: {
          name?: string;
          data?: InventoryStockPayload;
        }) => {
          if (!isMounted) {
            return;
          }
          if (!isInventoryStockEvent(message.name)) {
            return;
          }

          // Extract payload and call callback
          if (message.data && onInventoryUpdateRef.current) {
            onInventoryUpdateRef.current({
              stockItemId: message.data.stockItemId,
              newQuantity: message.data.newQuantity,
              previousQuantity: message.data.previousQuantity,
            });
          }
        };

        try {
          channel.subscribe(handleMessage);
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            logger.warn(
              logger.fmt`[useInventoryRealtime] Subscription error: ${String(error)}`
            );
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          logger.warn(
            logger.fmt`[useInventoryRealtime] Initialization error: ${String(error)}`
          );
        }
      }
    };

    initializeConnection().catch((error) => {
      if (process.env.NODE_ENV === "development") {
        logger.warn(
          logger.fmt`[useInventoryRealtime] Connection initialization failed: ${String(error)}`
        );
      }
    });

    return () => {
      isMounted = false;
      try {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
        }
        if (clientRef.current) {
          clientRef.current.close();
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          logger.warn(
            logger.fmt`[useInventoryRealtime] Cleanup error: ${String(error)}`
          );
        }
      }
    };
  }, [tenantId]);
}
