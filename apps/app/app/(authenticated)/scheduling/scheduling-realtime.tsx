"use client";

import type { Message } from "ably";
import { useChannel } from "ably/react";
import { useRouter } from "next/navigation";

interface SchedulingRealtimeProps {
  tenantId: string;
  userId?: string | null;
}

const isOpenShiftEvent = (eventName?: string) =>
  eventName?.startsWith("open_shift.") ?? false;

function SchedulingRealtimeSubscription({ tenantId }: { tenantId: string }) {
  const router = useRouter();

  useChannel(`tenant:${tenantId}`, (message: Message) => {
    if (!isOpenShiftEvent(message.name)) {
      return;
    }

    router.refresh();
  });

  return null;
}

const SchedulingRealtime = ({ tenantId }: SchedulingRealtimeProps) => {
  if (!(tenantId && process.env.NEXT_PUBLIC_ABLY_ENABLED)) {
    return null;
  }

  return <SchedulingRealtimeSubscription tenantId={tenantId} />;
};

export default SchedulingRealtime;
