"use client";

// biome-ignore lint/performance/noBarrelFile: Sentry requires namespace import for logger
import * as Sentry from "@sentry/nextjs";
import type { Message } from "ably";
import { useChannel, useConnectionStateListener } from "ably/react";
import { useRouter } from "next/navigation";

const { logger } = Sentry;

interface ProductionBoardRealtimeProps {
  tenantId: string;
  userId?: string | null;
}

const isKitchenTaskEvent = (eventName?: string) =>
  eventName?.startsWith("kitchen.task.") ?? false;

function ProductionBoardRealtimeSubscription({
  tenantId,
}: {
  tenantId: string;
}) {
  const router = useRouter();

  useConnectionStateListener(["failed", "suspended"], (stateChange) => {
    if (process.env.NODE_ENV === "development") {
      logger.warn(
        logger.fmt`[ProductionBoardRealtime] Ably connection ${stateChange.current}: ${stateChange.reason?.message ?? "unknown reason"}`
      );
    }
  });

  useChannel(`tenant:${tenantId}`, (message: Message) => {
    if (!isKitchenTaskEvent(message.name)) {
      return;
    }

    router.refresh();
  });

  return null;
}

export function ProductionBoardRealtime({
  tenantId,
}: ProductionBoardRealtimeProps) {
  if (!(tenantId && process.env.NEXT_PUBLIC_ABLY_ENABLED)) {
    return null;
  }

  return <ProductionBoardRealtimeSubscription tenantId={tenantId} />;
}
