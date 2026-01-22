"use client";

import Ably from "ably";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ProductionBoardRealtimeProps = {
  tenantId: string;
  userId?: string | null;
};

const getApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/$/, "");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return appUrl ? appUrl.replace(/\/$/, "") : "";
};

const isKitchenTaskEvent = (eventName?: string) =>
  eventName?.startsWith("kitchen.task.") ?? false;

export function ProductionBoardRealtime({
  tenantId,
  userId,
}: ProductionBoardRealtimeProps) {
  const router = useRouter();

  useEffect(() => {
    if (!tenantId) return;

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      return;
    }

    const client = new Ably.Realtime({
      authCallback: async (_, callback) => {
        try {
          const response = await fetch(`${apiBaseUrl}/ably/auth`, {
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
      if (!isKitchenTaskEvent(message.name)) return;
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
  }, [tenantId, userId, router]);

  return null;
}
