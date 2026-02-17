"use client";

import { captureException } from "@sentry/nextjs";
import Ably from "ably";
import { useEffect, useRef } from "react";

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

function logDev(message: string, ...args: unknown[]) {
  if (process.env.NODE_ENV === "development") {
    console.debug(message, ...args);
  }
}

async function testAuthEndpoint(tenantId: string): Promise<boolean> {
  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tenantId }),
  }).catch(() => null);

  return response?.ok ?? false;
}

function createAuthCallback(tenantId: string): Ably.AuthCallback {
  return async (_, callback) => {
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
      logDev("[useInventoryRealtime] Auth error:", message);
      callback(message, null);
    }
  };
}

function createMessageHandler(
  isMounted: () => boolean,
  callbackRef: React.MutableRefObject<
    ((payload: InventoryStockPayload) => void) | undefined
  >
) {
  return (message: { name?: string; data?: InventoryStockPayload }) => {
    if (!(isMounted() && isInventoryStockEvent(message.name))) {
      return;
    }

    if (message.data && callbackRef.current) {
      callbackRef.current({
        stockItemId: message.data.stockItemId,
        newQuantity: message.data.newQuantity,
        previousQuantity: message.data.previousQuantity,
      });
    }
  };
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
    const checkMounted = () => isMounted;

    const initializeConnection = async () => {
      const isAvailable = await testAuthEndpoint(tenantId);
      if (!isAvailable) {
        logDev(
          "[useInventoryRealtime] Auth endpoint not available, skipping real-time connection"
        );
        return;
      }

      if (!isMounted) {
        return;
      }

      const client = new Ably.Realtime({
        authCallback: createAuthCallback(tenantId),
      });

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

        if (reason) {
          logDev(`[useInventoryRealtime] Connection state: ${current}`, {
            reason,
            retryIn,
          });
        }
      });

      clientRef.current = client;

      const channel = client.channels.get(`tenant:${tenantId}`);
      channelRef.current = channel;

      const handleMessage = createMessageHandler(
        checkMounted,
        onInventoryUpdateRef
      );

      try {
        channel.subscribe(handleMessage);
      } catch (error) {
        logDev("[useInventoryRealtime] Subscription error:", String(error));
        captureException(error);
      }
    };

    initializeConnection().catch((error) => {
      logDev(
        "[useInventoryRealtime] Connection initialization failed:",
        String(error)
      );
      captureException(error);
    });

    return () => {
      isMounted = false;
      try {
        channelRef.current?.unsubscribe();
        clientRef.current?.close();
      } catch (error) {
        logDev("[useInventoryRealtime] Cleanup error:", String(error));
      }
    };
  }, [tenantId]);
}
