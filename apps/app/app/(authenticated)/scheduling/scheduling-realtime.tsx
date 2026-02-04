"use client";

import Ably from "ably";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface SchedulingRealtimeProps {
  tenantId: string;
  userId?: string | null;
}

const authUrl = "/ably/auth";

const isOpenShiftEvent = (eventName?: string) =>
  eventName?.startsWith("open_shift.") ?? false;

const SchedulingRealtime = ({ tenantId, userId }: SchedulingRealtimeProps) => {
  const router = useRouter();

  useEffect(() => {
    if (!tenantId) {
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

    const channel = client.channels.get(`tenant:${tenantId}`);
    const handleMessage = (message: { name?: string }) => {
      if (!isOpenShiftEvent(message.name)) {
        return;
      }
      router.refresh();
    };

    channel.subscribe(handleMessage);

    return () => {
      channel.unsubscribe(handleMessage);
      // Note: We don't close the client here because:
      // 1. Multiple components may share the same connection
      // 2. The connection lifecycle should be managed at the app level
      // 3. Closing and recreating connections causes "Connection closed" errors
    };
  }, [tenantId, router]);

  return null;
};

export default SchedulingRealtime;
