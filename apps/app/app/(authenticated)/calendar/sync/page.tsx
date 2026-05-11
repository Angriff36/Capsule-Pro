"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
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
import { log } from "@repo/observability/log";

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

const PROVIDERS = [
  {
    id: "google",
    name: "Google Calendar",
    icon: "📅",
    description: "Sync events from your Google Calendar",
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    icon: "📆",
    description: "Sync events from your Outlook Calendar",
  },
];

export default function CalendarSyncPage() {
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
    } catch (error) {
      log.error("Failed to fetch sync status:", { error });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  // Clear URL params after showing message
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
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      } else {
        const error = await response.json();
        toast.error(`Failed to connect: ${error.error}`);
        setActionLoading(null);
      }
    } catch (error) {
      log.error("Connect error:", { error });
      toast.error("Failed to initiate connection");
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) {
      return;
    }

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
    } catch (error) {
      log.error("Disconnect error:", { error });
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
    } catch (error) {
      log.error("Sync error:", { error });
      toast.error("Failed to trigger sync");
    } finally {
      setActionLoading(null);
    }
  };

  const getSyncForProvider = (providerId: string): SyncStatus | undefined => {
    return syncs.find((s) => s.provider === providerId);
  };

  const getStatusBadge = (sync: SyncStatus | undefined) => {
    if (!sync || sync.status === "disconnected") {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    if (sync.status === "connected") {
      return <Badge variant="default">Connected</Badge>;
    }
    if (sync.status === "error") {
      return <Badge variant="destructive">Error</Badge>;
    }
    return <Badge variant="outline">{sync.status}</Badge>;
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Link href="/calendar">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Calendar Sync
          </h1>
        </div>
        <p className="text-muted-foreground">
          Connect external calendars to import events automatically.
        </p>
      </div>
      <Separator />

      {/* Success/Error Messages */}
      {connectedProvider && (
        <Card className="border-[var(--ds-calendar-shift)] bg-[var(--ds-calendar-shift-light)]" tone="canvas">
          <CardContent className="flex items-center gap-2 pt-6">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-green-700">
              {connectedProvider === "google"
                ? "Google Calendar"
                : "Microsoft Outlook"}{" "}
              connected successfully!
            </span>
          </CardContent>
        </Card>
      )}
      {errorMessage && (
        <Card className="border-destructive/30 bg-destructive/5" tone="canvas">
          <CardContent className="flex items-center gap-2 pt-6">
            <X className="h-4 w-4 text-red-600" />
            <span className="text-red-700">
              Connection failed: {errorMessage}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Provider Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {PROVIDERS.map((provider) => {
            const sync = getSyncForProvider(provider.id);
            const isLoading =
              actionLoading === provider.id ||
              actionLoading === `sync-${provider.id}` ||
              actionLoading === `disconnect-${provider.id}`;

            return (
              <Card key={provider.id} tone="canvas">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{provider.icon}</span>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                    </div>
                    {getStatusBadge(sync)}
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sync?.lastSyncAt && (
                    <div className="text-sm text-muted-foreground">
                      Last synced: {new Date(sync.lastSyncAt).toLocaleString()}
                      {sync.lastSyncStatus && (
                        <span className="ml-2">({sync.lastSyncStatus})</span>
                      )}
                    </div>
                  )}
                  {sync?.lastSyncError && (
                    <div className="text-sm text-red-600">
                      Error: {sync.lastSyncError}
                    </div>
                  )}
                  {sync?.calendarName && (
                    <div className="text-sm text-muted-foreground">
                      Calendar: {sync.calendarName}
                    </div>
                  )}
                  <div className="flex gap-2">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Setup Instructions */}
      <Card tone="canvas">
        <CardHeader>
          <CardTitle className="text-lg">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong>Google Calendar:</strong>
          </p>
          <ol className="list-inside list-decimal space-y-1 pl-2">
            <li>
              Go to{" "}
              <a
                className="text-primary underline"
                href="https://console.cloud.google.com/apis/credentials"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google Cloud Console
              </a>
            </li>
            <li>Create OAuth 2.0 credentials</li>
            <li>
              Add the redirect URI:{" "}
              <code className="bg-muted rounded px-1">
                {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:2221"}
                /api/calendar/sync/callback/google
              </code>
            </li>
            <li>
              Set{" "}
              <code className="bg-muted rounded px-1">GOOGLE_CLIENT_ID</code>{" "}
              and{" "}
              <code className="bg-muted rounded px-1">
                GOOGLE_CLIENT_SECRET
              </code>{" "}
              in your environment
            </li>
          </ol>
          <Separator className="my-4" />
          <p>
            <strong>Microsoft Outlook:</strong>
          </p>
          <ol className="list-inside list-decimal space-y-1 pl-2">
            <li>
              Go to{" "}
              <a
                className="text-primary underline"
                href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                rel="noopener noreferrer"
                target="_blank"
              >
                Azure App Registrations
              </a>
            </li>
            <li>Register a new application</li>
            <li>
              Add the redirect URI:{" "}
              <code className="bg-muted rounded px-1">
                {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:2221"}
                /api/calendar/sync/callback/outlook
              </code>
            </li>
            <li>
              Set{" "}
              <code className="bg-muted rounded px-1">MICROSOFT_CLIENT_ID</code>{" "}
              and{" "}
              <code className="bg-muted rounded px-1">
                MICROSOFT_CLIENT_SECRET
              </code>{" "}
              in your environment
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Link to Calendar */}
      <div className="flex justify-end">
        <Link href="/calendar">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
        </Link>
      </div>
    </div>
  );
}
