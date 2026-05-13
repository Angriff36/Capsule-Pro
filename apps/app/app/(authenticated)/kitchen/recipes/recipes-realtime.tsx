"use client";

import type { Message } from "ably";
import { useChannel } from "ably/react";
import { useRouter } from "next/navigation";

interface RecipesRealtimeProps {
  tenantId: string;
  userId?: string | null;
}

const isRecipeEvent = (eventName?: string) =>
  eventName?.startsWith("recipe.") ?? false;

function RecipesRealtimeSubscription({ tenantId }: { tenantId: string }) {
  const router = useRouter();

  useChannel(`tenant:${tenantId}`, (message: Message) => {
    if (!isRecipeEvent(message.name)) {
      return;
    }

    router.refresh();
  });

  return null;
}

const RecipesRealtime = ({ tenantId }: RecipesRealtimeProps) => {
  if (!(tenantId && process.env.NEXT_PUBLIC_ABLY_ENABLED)) {
    return null;
  }

  return <RecipesRealtimeSubscription tenantId={tenantId} />;
};

export default RecipesRealtime;
