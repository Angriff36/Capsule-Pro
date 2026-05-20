"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  type RealtimeEventMessage,
  useRealtimeChannel,
} from "@/app/lib/use-realtime-channel";

interface SchedulingRealtimeProps {
  tenantId: string;
  userId?: string | null;
}

const isOpenShiftEvent = (name?: string) =>
  name?.startsWith("open_shift.") ?? false;

const SchedulingRealtime = ({ tenantId }: SchedulingRealtimeProps) => {
  const router = useRouter();
  const enabled = Boolean(
    tenantId && process.env.NEXT_PUBLIC_REALTIME_ENABLED
  );

  const handleMessage = useCallback(
    (message: RealtimeEventMessage) => {
      if (!isOpenShiftEvent(message.name)) {
        return;
      }
      router.refresh();
    },
    [router]
  );

  useRealtimeChannel(tenantId, handleMessage, { enabled });

  return null;
};

export default SchedulingRealtime;
