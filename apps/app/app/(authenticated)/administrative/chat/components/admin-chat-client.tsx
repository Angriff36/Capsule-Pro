"use client";

import Ably from "ably";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { useEffect, useMemo, useRef, useState } from "react";

interface AdminChatMessage {
  id: string;
  author: string;
  text: string;
  time: string;
  fromMe: boolean;
}

interface AdministrativeChatClientProps {
  tenantId: string;
  userId: string;
  displayName: string;
}

const authUrl = "/ably/chat/auth";
const channelSuffix = "admin-chat";
const messageName = "admin.chat.message";

const formatTime = (timestamp?: number | string) => {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const mapMessage = (
  message: Ably.Message,
  clientId: string
): AdminChatMessage => {
  const data = message.data as { text?: string; author?: string } | null;

  return {
    id: message.id ?? `${message.timestamp ?? Date.now()}`,
    author: data?.author ?? "Unknown",
    text: data?.text ?? "",
    time: formatTime(message.timestamp ?? Date.now()),
    fromMe: message.clientId === clientId,
  };
};

export function AdministrativeChatClient({
  tenantId,
  userId,
  displayName,
}: AdministrativeChatClientProps) {
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const clientId = useMemo(
    () => `tenant:${tenantId}:user:${userId}`,
    [tenantId, userId]
  );

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    let isMounted = true;

    const initializeConnection = async () => {
      try {
        const testResponse = await fetch(authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tenantId }),
        }).catch(() => null);

        if (!testResponse?.ok) {
          return;
        }

        if (!isMounted) {
          return;
        }

        const client = new Ably.Realtime({
          authCallback: async (_, callback) => {
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
              callback(message, null);
            }
          },
        });

        clientRef.current = client;

        client.connection.on((stateChange) => {
          if (!isMounted) {
            return;
          }
          setIsConnected(stateChange.current === "connected");
        });

        const channel = client.channels.get(`tenant:${tenantId}:${channelSuffix}`);
        channelRef.current = channel;

        try {
          const historyPage = await channel.history({
            limit: 50,
            direction: "backwards",
          });
          if (!isMounted) {
            return;
          }
          const historyMessages = historyPage.items
            .slice()
            .reverse()
            .map((message) => mapMessage(message, clientId));
          setMessages(historyMessages);
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[AdministrativeChat] History error:", error);
          }
        }

        const handleMessage = (message: Ably.Message) => {
          if (!isMounted) {
            return;
          }
          setMessages((prev) => [...prev, mapMessage(message, clientId)]);
        };

        try {
          channel.subscribe(messageName, handleMessage);
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[AdministrativeChat] Subscription error:", error);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AdministrativeChat] Initialization error:", error);
        }
      }
    };

    initializeConnection().catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[AdministrativeChat] Connection failed:", error);
      }
    });

    return () => {
      isMounted = false;
      try {
        channelRef.current?.unsubscribe();
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AdministrativeChat] Cleanup error:", error);
        }
      }
    };
  }, [tenantId, clientId]);

  const handleSend = async () => {
    const trimmed = draft.trim();

    if (!trimmed || !channelRef.current) {
      return;
    }

    setDraft("");

    try {
      await channelRef.current.publish(messageName, {
        text: trimmed,
        author: displayName,
        createdAt: Date.now(),
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[AdministrativeChat] Publish error:", error);
      }
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Administrative Chat</h2>
          <p className="text-sm text-muted-foreground">
            Real-time updates from leadership and operations.
          </p>
        </div>
        <Badge variant={isConnected ? "secondary" : "outline"}>
          {isConnected ? "Live" : "Connecting"}
        </Badge>
      </div>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Team thread</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                No messages yet. Start the conversation.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  className={`rounded-lg border p-3 ${
                    message.fromMe
                      ? "border-transparent bg-primary/10"
                      : "border-border"
                  }`}
                  key={message.id}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{message.author}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {message.time}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{message.text}</p>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            <Textarea
              className="min-h-[120px]"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Send a quick update..."
              value={draft}
            />
            <div className="flex justify-end">
              <Button disabled={!draft.trim()} onClick={handleSend}>
                Send update
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
