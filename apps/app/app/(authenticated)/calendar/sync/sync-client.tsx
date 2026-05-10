"use client";

import { CapabilityCard } from "@repo/design-system/components/blocks/capability-card";
import {
  MonoLabel,
  OperationalColumn,
  OperationalLine,
  SectionHeader,
  StatusPill,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface SyncStatus {
  id: string;
  provider: string;
  calendarName: string | null;
  status: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  enabled: boolean;
}

function formatLastSync(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString();
}

export function SyncClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [syncs, setSyncs] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const connectedProvider = searchParams?.get("connected") ?? null;
  const errorMessage = searchParams?.get("error") ?? null;

  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await apiFetch("/api/calendar/sync/status");
      if (response.ok) {
        const data = await response.json();
        setSyncs(data.syncs || []);
      }
    } catch {
      toast.error("Failed to fetch sync status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  useEffect(() => {
    if (connectedProvider || errorMessage) {
      const timer = setTimeout(() => {
        router.replace("/calendar/sync");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [connectedProvider, errorMessage, router]);

  const handleConnect = async (provider: string) => {
    setActionLoading(provider);
    try {
      const response = await apiFetch("/api/calendar/sync/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, action: "initiate" }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        const error = await response.json();
        toast.error(`Failed to connect: ${error.error}`);
        setActionLoading(null);
      }
    } catch {
      toast.error("Failed to initiate connection");
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

    setActionLoading(`disconnect-${provider}`);
    try {
      const response = await apiFetch("/api/calendar/sync/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      if (response.ok) {
        await fetchSyncStatus();
      } else {
        const error = await response.json();
        toast.error(`Failed to disconnect: ${error.error}`);
      }
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSync = async (provider: string) => {
    setActionLoading(`sync-${provider}`);
    try {
      const response = await apiFetch("/api/calendar/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Sync complete! Imported ${data.imported} events.`);
        await fetchSyncStatus();
      } else {
        const error = await response.json();
        toast.error(`Sync failed: ${error.error}`);
      }
    } catch {
      toast.error("Failed to trigger sync");
    } finally {
      setActionLoading(null);
    }
  };

  const getSyncForProvider = (providerId: string): SyncStatus | undefined => {
    return syncs.find((s) => s.provider === providerId);
  };

  const providers = [
    { id: "google", name: "Google Calendar" },
    { id: "outlook", name: "Microsoft Outlook" },
  ];

  const connectedCount = syncs.filter((s) => s.status === "connected").length;

  return (
    <OperationalColumn>
      {/* Status messages */}
      {connectedProvider && (
        <div className="flex items-center gap-2 rounded-xs border border-hairline bg-canvas p-3">
          <Check className="h-4 w-4 text-ink" />
          <span className="ds-body text-ink">
            {connectedProvider === "google"
              ? "Google Calendar"
              : "Microsoft Outlook"}{" "}
            connected successfully!
          </span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xs border border-hairline bg-canvas p-3">
          <X className="h-4 w-4 text-ink" />
          <span className="ds-body text-ink">
            Connection failed: {errorMessage}
          </span>
        </div>
      )}

      <SectionHeader title="Connected Providers" />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-ink/40" />
        </div>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => {
            const sync = getSyncForProvider(provider.id);
            const isLoading =
              actionLoading === provider.id ||
              actionLoading === `sync-${provider.id}` ||
              actionLoading === `disconnect-${provider.id}`;

            return (
              <div
                className="rounded-xs border border-hairline bg-canvas p-4 space-y-3"
                data-slot="sync-provider"
                key={provider.id}
              >
                <div className="flex items-center justify-between">
                  <span className="ds-feature-heading text-ink">
                    {provider.name}
                  </span>
                  {sync?.status === "connected" ? (
                    <StatusPill className="border-green-600 text-green-600">
                      Connected
                    </StatusPill>
                  ) : sync?.status === "error" ? (
                    <StatusPill className="border-red-600 text-red-600">
                      Error
                    </StatusPill>
                  ) : (
                    <StatusPill>Not Connected</StatusPill>
                  )}
                </div>

                {sync?.lastSyncAt && (
                  <OperationalLine>
                    <MonoLabel tone="dark">Last sync</MonoLabel>
                    <span className="ds-body text-ink/75">
                      {formatLastSync(sync.lastSyncAt)}
                    </span>
                  </OperationalLine>
                )}
                {sync?.calendarName && (
                  <OperationalLine>
                    <MonoLabel tone="dark">Calendar</MonoLabel>
                    <span className="ds-body text-ink/75">
                      {sync.calendarName}
                    </span>
                  </OperationalLine>
                )}
                {sync?.lastSyncError && (
                  <OperationalLine>
                    <MonoLabel tone="dark">Error</MonoLabel>
                    <span className="ds-body text-ink/75">
                      {sync.lastSyncError}
                    </span>
                  </OperationalLine>
                )}

                <div className="flex gap-2 pt-1">
                  {sync?.status === "connected" ? (
                    <>
                      <Button
                        disabled={isLoading}
                        onClick={() => handleSync(provider.id)}
                        size="sm"
                      >
                        {actionLoading === `sync-${provider.id}` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Sync Now
                      </Button>
                      <Button
                        disabled={isLoading}
                        onClick={() => handleDisconnect(provider.id)}
                        size="sm"
                        variant="outline"
                      >
                        {actionLoading === `disconnect-${provider.id}` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      disabled={isLoading}
                      onClick={() => handleConnect(provider.id)}
                      size="sm"
                    >
                      {actionLoading === provider.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 h-4 w-4" />
                      )}
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SectionHeader title="Setup Instructions">
        <MonoLabel tone="dark">Setup Instructions</MonoLabel>
      </SectionHeader>

      <div className="space-y-4">
        <CapabilityCard
          description="Go to Google Cloud Console, create OAuth 2.0 credentials, and add the redirect URI. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment."
          meta="01 / Provider"
          title="Google Calendar"
        />
        <CapabilityCard
          description="Go to Azure App Registrations, register a new application, and add the redirect URI. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in your environment."
          meta="02 / Provider"
          title="Microsoft Outlook"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Link href="/calendar">
          <Button size="sm" variant="outline">
            Back to Calendar
          </Button>
        </Link>
      </div>
    </OperationalColumn>
  );
}
