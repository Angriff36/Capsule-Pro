"use client";

import { captureException } from "@sentry/nextjs";
import Ably from "ably";
import { useEffect, useRef } from "react";

const authUrl = "/ably/auth";

const isQualityEvent = (eventName?: string) =>
  eventName?.startsWith("quality.") ?? false;

interface QualityInspectionPayload {
  inspectionId: string;
  status: string;
  passRate: number;
  failedItems: number;
  locationId: string;
}

interface QualityCorrectiveActionPayload {
  actionId: string;
  status: string;
  severity: string;
  locationId: string;
}

interface UseQualityRealtimeProps {
  tenantId: string;
  onInspectionUpdate?: (payload: QualityInspectionPayload) => void;
  onCorrectiveActionUpdate?: (payload: QualityCorrectiveActionPayload) => void;
}

function logDev(message: string, ...args: unknown[]) {
  if (process.env.NODE_ENV === "development") {
    console.debug(message, ...args);
  }
}

async function testAuthEndpoint(tenantId: string): Promise<boolean> {
  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tenantId }),
  }).catch(() => null);

  return response?.ok ?? false;
}

function createAuthCallback(tenantId: string) {
  return async (
    _tokenParams: Ably.TokenParams,
    callback: (
      error: Ably.ErrorInfo | string | null,
      tokenRequestOrDetails:
        | Ably.TokenDetails
        | Ably.TokenRequest
        | string
        | null
    ) => void
  ) => {
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
      logDev("[useQualityRealtime] Auth error:", message);
      callback(message, null);
    }
  };
}

function createMessageHandler(
  isMounted: () => boolean,
  inspectionCallbackRef: React.MutableRefObject<
    ((payload: QualityInspectionPayload) => void) | undefined
  >,
  correctiveActionCallbackRef: React.MutableRefObject<
    ((payload: QualityCorrectiveActionPayload) => void) | undefined
  >
) {
  return (message: {
    name?: string;
    data?: QualityInspectionPayload | QualityCorrectiveActionPayload;
  }) => {
    if (!(isMounted() && isQualityEvent(message.name))) {
      return;
    }

    if (!message.data) {
      return;
    }

    // Inspection events
    if (
      message.name?.startsWith("quality.inspection.") &&
      inspectionCallbackRef.current
    ) {
      inspectionCallbackRef.current(message.data as QualityInspectionPayload);
    }

    // Corrective action events
    if (
      message.name?.startsWith("quality.corrective.") &&
      correctiveActionCallbackRef.current
    ) {
      correctiveActionCallbackRef.current(
        message.data as QualityCorrectiveActionPayload
      );
    }
  };
}

/**
 * Hook to subscribe to real-time quality control events.
 * Provides callbacks for inspection updates and corrective action changes.
 */
export function useQualityRealtime({
  tenantId,
  onInspectionUpdate,
  onCorrectiveActionUpdate,
}: UseQualityRealtimeProps) {
  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const onInspectionUpdateRef = useRef(onInspectionUpdate);
  const onCorrectiveActionUpdateRef = useRef(onCorrectiveActionUpdate);

  // Keep callback refs updated
  useEffect(() => {
    onInspectionUpdateRef.current = onInspectionUpdate;
    onCorrectiveActionUpdateRef.current = onCorrectiveActionUpdate;
  }, [onInspectionUpdate, onCorrectiveActionUpdate]);

  useEffect(() => {
    if (!(tenantId && process.env.NEXT_PUBLIC_ABLY_ENABLED)) {
      return;
    }

    let isMounted = true;
    const checkMounted = () => isMounted;

    const initializeConnection = async () => {
      const isAvailable = await testAuthEndpoint(tenantId);
      if (!isAvailable) {
        logDev(
          "[useQualityRealtime] Auth endpoint not available, skipping real-time connection"
        );
        return;
      }

      if (!isMounted) {
        return;
      }

      const client = new Ably.Realtime({
        authCallback: createAuthCallback(tenantId),
      });

      client.connection.on((stateChange) => {
        if (!isMounted) {
          return;
        }

        const { current, reason } = stateChange;

        if (
          current === "failed" ||
          current === "suspended" ||
          current === "disconnected" ||
          current === "closed"
        ) {
          return;
        }

        if (reason) {
          logDev(`[useQualityRealtime] Connection state: ${current}`, {
            reason,
          });
        }
      });

      clientRef.current = client;

      const channel = client.channels.get(`tenant:${tenantId}`);
      channelRef.current = channel;

      const handleMessage = createMessageHandler(
        checkMounted,
        onInspectionUpdateRef,
        onCorrectiveActionUpdateRef
      );

      try {
        channel.subscribe(handleMessage);
      } catch (error) {
        logDev("[useQualityRealtime] Subscription error:", String(error));
        captureException(error);
      }
    };

    initializeConnection().catch((error) => {
      logDev(
        "[useQualityRealtime] Connection initialization failed:",
        String(error)
      );
      captureException(error);
    });

    return () => {
      isMounted = false;
      try {
        channelRef.current?.unsubscribe();
        clientRef.current?.close();
      } catch (error) {
        logDev("[useQualityRealtime] Cleanup error:", String(error));
      }
    };
  }, [tenantId]);
}
