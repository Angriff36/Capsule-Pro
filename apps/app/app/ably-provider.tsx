"use client";

import Ably from "ably";
import { AblyProvider as ReactAblyProvider } from "ably/react";
import { type ReactNode, useMemo } from "react";

const defaultAuthUrl = "/ably/auth";
const clientCache = new Map<string, Ably.Realtime>();

export function getAblyClient(
  tenantId: string,
  authEndpoint = defaultAuthUrl
): Ably.Realtime {
  const cacheKey = `${authEndpoint}:${tenantId}`;
  const existing = clientCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const client = new Ably.Realtime({
    authCallback: async (_, callback) => {
      try {
        const response = await fetch(authEndpoint, {
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

  clientCache.set(cacheKey, client);
  return client;
}

interface AblyProviderProps {
  readonly children: ReactNode;
  readonly tenantId: string | null;
}

export function AblyProvider({ children, tenantId }: AblyProviderProps) {
  const enabled = Boolean(tenantId && process.env.NEXT_PUBLIC_ABLY_ENABLED);
  const client = useMemo(
    () => (enabled && tenantId ? getAblyClient(tenantId) : null),
    [enabled, tenantId]
  );

  if (!(enabled && client)) {
    return children;
  }

  return <ReactAblyProvider client={client}>{children}</ReactAblyProvider>;
}
