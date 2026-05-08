"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Building2Icon, Loader2Icon, SearchIcon, UserIcon } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { assignClientToEvent } from "../../actions";

interface ClientResult {
  id: string;
  clientType: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface ClientAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onAssigned: () => void;
}

export const ClientAssignDialog = ({
  open,
  onOpenChange,
  eventId,
  onAssigned,
}: ClientAssignDialogProps) => {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const searchClients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setClients([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      const res = await fetch(`/api/crm/clients?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to search clients");
      const data = await res.json();
      setClients(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setClients([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchClients]);

  const handleAssign = (clientId: string) => {
    startTransition(async () => {
      try {
        await assignClientToEvent(eventId, clientId);
        onAssigned();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Assignment failed");
      }
    });
  };

  const formatClientName = (client: ClientResult): string => {
    if (client.clientType === "company" && client.company_name) {
      return client.company_name;
    }
    const name = [client.first_name, client.last_name]
      .filter(Boolean)
      .join(" ");
    return name || "Unnamed Client";
  };

  const formatSubtitle = (client: ClientResult): string => {
    const parts: string[] = [];
    if (client.email) parts.push(client.email);
    if (client.phone) parts.push(client.phone);
    if (
      client.clientType === "company" &&
      (client.first_name || client.last_name)
    ) {
      const contact = [client.first_name, client.last_name]
        .filter(Boolean)
        .join(" ");
      parts.unshift(`Contact: ${contact}`);
    }
    return parts.join(" · ") || "No contact info";
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[80vh] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Client</DialogTitle>
          <DialogDescription>
            Search for a CRM client to link to this event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-search">Search clients</Label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                className="pl-10"
                id="client-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or company..."
                value={search}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Searching...
              </div>
            ) : clients.length === 0 ? (
              search.trim() ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No clients found.{" "}
                  <a
                    className="underline hover:text-foreground"
                    href="/crm/clients/new"
                    rel="noopener"
                    target="_blank"
                  >
                    Create one?
                  </a>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Type to search CRM clients
                </div>
              )
            ) : (
              <div className="space-y-1">
                {clients.map((client) => (
                  <button
                    className="w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                    disabled={isPending}
                    key={client.id}
                    onClick={() => handleAssign(client.id)}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {client.clientType === "company" ? (
                          <Building2Icon className="size-4 text-muted-foreground" />
                        ) : (
                          <UserIcon className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {formatClientName(client)}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {formatSubtitle(client)}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs capitalize text-muted-foreground">
                        {client.clientType}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
