"use client";

/**
 * IoT Monitoring Real-time Updates
 *
 * WebSocket component for real-time IoT sensor data updates using Ably.
 */

import Ably from "ably";
import { useEffect, useRef } from "react";

const authUrl = "/ably/auth";

interface IotMonitoringRealtimeProps {
  tenantId: string;
  onUpdate: () => void;
}

const isIoTEvent = (eventName?: string) =>
  eventName?.startsWith("iot.") ?? false;

export function IotMonitoringRealtime({
  tenantId,
  onUpdate,
}: IotMonitoringRealtimeProps) {
  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  useEffect(() => {
    if (!(tenantId && process.env.NEXT_PUBLIC_ABLY_ENABLED)) {
      return;
    }

    let isMounted = true;

    const initializeConnection = async () => {
      try {
        // Test auth endpoint
        const testResponse = await fetch(authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tenantId }),
        }).catch(() => null);

        if (!testResponse?.ok) {
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
              callback(message, null);
            }
          },
        });

        client.connection.on((stateChange) => {
          if (!isMounted) {
            return;
          }

          const { current } = stateChange;

          // Suppress connection errors - real-time is optional
          if (
            current === "failed" ||
            current === "suspended" ||
            current === "disconnected" ||
            current === "closed"
          ) {
            return;
          }
        });

        clientRef.current = client;

        const channel = client.channels.get(`tenant:${tenantId}`);
        channelRef.current = channel;

        const handleMessage = () => {
          if (!isMounted) {
            return;
          }
          // Trigger refresh when IoT events occur
          onUpdate();
        };

        try {
          channel.subscribe(handleMessage);
        } catch (error) {
          // Ignore subscription errors
        }
      } catch (error) {
        // Fail silently
      }
    };

    initializeConnection().catch(() => {
      // Ignore initialization errors
    });

    return () => {
      isMounted = false;
      try {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, [tenantId, onUpdate]);

  return null;
}
