"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  type RealtimeEventMessage,
  useRealtimeChannel,
} from "@/app/lib/use-realtime-channel";

interface ProductionBoardRealtimeProps {
  tenantId: string;
  userId?: string | null;
}

const isKitchenTaskEvent = (name?: string) =>
  name?.startsWith("kitchen.task.") ?? false;

export function ProductionBoardRealtime({
  tenantId,
}: ProductionBoardRealtimeProps) {
  const router = useRouter();
  const enabled = Boolean(
    tenantId && process.env.NEXT_PUBLIC_REALTIME_ENABLED
  );

  const handleMessage = useCallback(
    (message: RealtimeEventMessage) => {
      if (!isKitchenTaskEvent(message.name)) {
        return;
      }
      router.refresh();
    },
    [router]
  );

  useRealtimeChannel(tenantId, handleMessage, { enabled });

  return null;
}
