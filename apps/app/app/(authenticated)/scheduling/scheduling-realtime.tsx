"use client";

import Ably from "ably/browser";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type SchedulingRealtimeProps = {
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

const isOpenShiftEvent = (eventName?: string) =>
  eventName?.startsWith("open_shift.") ?? false;

const SchedulingRealtime = ({ tenantId, userId }: SchedulingRealtimeProps) => {
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
          callback(error as Error, null);
        }
      },
    });

    const channel = client.channels.get(`tenant:${tenantId}`);
    const handleMessage = (message: { name?: string }) => {
      if (!isOpenShiftEvent(message.name)) return;
      router.refresh();
    };

    channel.subscribe(handleMessage);

    return () => {
      channel.unsubscribe(handleMessage);
      if (client.connection.state !== "closed") {
        client.close();
      }
    };
  }, [tenantId, userId, router]);

  return null;
};

export default SchedulingRealtime;
