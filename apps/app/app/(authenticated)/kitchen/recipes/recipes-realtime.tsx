"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  type RealtimeEventMessage,
  useRealtimeChannel,
} from "@/app/lib/use-realtime-channel";

interface RecipesRealtimeProps {
  tenantId: string;
  userId?: string | null;
}

const isRecipeEvent = (name?: string) => name?.startsWith("recipe.") ?? false;

const RecipesRealtime = ({ tenantId }: RecipesRealtimeProps) => {
  const router = useRouter();
  const enabled = Boolean(
    tenantId && process.env.NEXT_PUBLIC_REALTIME_ENABLED
  );

  const handleMessage = useCallback(
    (message: RealtimeEventMessage) => {
      if (!isRecipeEvent(message.name)) {
        return;
      }
      router.refresh();
    },
    [router]
  );

  useRealtimeChannel(tenantId, handleMessage, { enabled });

  return null;
};

export default RecipesRealtime;
