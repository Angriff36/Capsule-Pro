"use client";

import Ably from "ably";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type RecipesRealtimeProps = {
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

const isRecipeEvent = (eventName?: string) =>
  eventName?.startsWith("recipe.") ?? false;

const RecipesRealtime = ({ tenantId, userId }: RecipesRealtimeProps) => {
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
            body: JSON.stringify({ tenantId, userId: userId ?? undefined }),
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
      if (!isRecipeEvent(message.name)) return;
      router.refresh();
    };

    channel.subscribe(handleMessage);

    return () => {
      channel.unsubscribe(handleMessage);
      const releasableStates = new Set(["initialized", "detached", "failed"]);
      if (releasableStates.has(channel.state)) {
        client.channels.release(`tenant:${tenantId}`);
      }
    };
  }, [tenantId, userId, router]);

  return null;
};

export default RecipesRealtime;

