"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import Ably from "ably";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/app/lib/api";

interface AdminChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
  fromMe: boolean;
}

interface ThreadParticipantSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

interface ThreadMessageSummary {
  id: string;
  text: string;
  authorName: string;
  createdAt: Date;
}

interface ThreadSummary {
  id: string;
  type: "team" | "direct";
  title: string;
  lastMessage: ThreadMessageSummary | null;
  lastMessageAt: Date | null;
  archivedAt: Date | null;
  clearedAt: Date | null;
  participant: ThreadParticipantSummary | null;
}

interface ApiThreadSummary {
  id: string;
  type: "team" | "direct";
  title: string;
  lastMessage: {
    id: string;
    text: string;
    authorName: string;
    createdAt: string;
  } | null;
  lastMessageAt: string | null;
  archivedAt: string | null;
  clearedAt: string | null;
  participant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}

interface ApiThreadResponse {
  threads: ApiThreadSummary[];
  teamThreadId?: string | null;
}

interface ApiMessage {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

interface EmployeeApiRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

interface RealtimePayload {
  id?: string;
  threadId?: string;
  text?: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
}

interface AdministrativeChatClientProps {
  tenantId: string;
  employeeId: string;
}

const authUrl = "/ably/chat/auth";
const messageName = "admin.chat.message";
const messageCacheLimit = 200;
const loadLimit = 50;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTime = (timestamp?: number) => {
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

const formatDisplayName = (employee: {
  firstName: string;
  lastName: string;
  email: string;
}) => {
  return `${employee.firstName} ${employee.lastName}`.trim() || employee.email;
};

const parseRealtimePayload = (value: unknown): RealtimePayload => {
  if (!isRecord(value)) {
    return {};
  }
  const payload: RealtimePayload = {};
  if (typeof value.id === "string") {
    payload.id = value.id;
  }
  if (typeof value.threadId === "string") {
    payload.threadId = value.threadId;
  }
  if (typeof value.text === "string") {
    payload.text = value.text;
  }
  if (typeof value.authorId === "string") {
    payload.authorId = value.authorId;
  }
  if (typeof value.authorName === "string") {
    payload.authorName = value.authorName;
  }
  if (typeof value.createdAt === "string") {
    payload.createdAt = value.createdAt;
  }
  return payload;
};

const toRealtimeMessage = (
  message: Ably.Message,
  employeeId: string
): { threadId: string; message: AdminChatMessage } | null => {
  const payload = parseRealtimePayload(message.data);
  const text = payload.text ?? "";
  const threadId = payload.threadId ?? "";

  if (!(text && threadId)) {
    return null;
  }

  const fallbackTimestamp = message.timestamp ?? Date.now();
  const parsedTimestamp = payload.createdAt
    ? new Date(payload.createdAt).getTime()
    : fallbackTimestamp;
  const timestamp = Number.isNaN(parsedTimestamp)
    ? fallbackTimestamp
    : parsedTimestamp;

  const authorId = payload.authorId ?? "";
  const authorName = payload.authorName ?? "Unknown";
  const id = payload.id ?? message.id ?? `${timestamp}`;

  return {
    threadId,
    message: {
      id,
      authorId,
      authorName,
      text,
      timestamp,
      fromMe: authorId === employeeId,
    },
  };
};

const toApiMessage = (message: ApiMessage, employeeId: string) => {
  const timestamp = new Date(message.createdAt).getTime();
  const safeTimestamp = Number.isNaN(timestamp) ? Date.now() : timestamp;
  return {
    id: message.id,
    authorId: message.authorId,
    authorName: message.authorName,
    text: message.text,
    timestamp: safeTimestamp,
    fromMe: message.authorId === employeeId,
  } as AdminChatMessage;
};

const toThreadSummary = (thread: ApiThreadSummary): ThreadSummary => {
  const lastMessage = thread.lastMessage
    ? {
        id: thread.lastMessage.id,
        text: thread.lastMessage.text,
        authorName: thread.lastMessage.authorName,
        createdAt: parseDate(thread.lastMessage.createdAt) ?? new Date(),
      }
    : null;

  return {
    id: thread.id,
    type: thread.type,
    title: thread.title,
    lastMessage,
    lastMessageAt: parseDate(thread.lastMessageAt),
    archivedAt: parseDate(thread.archivedAt),
    clearedAt: parseDate(thread.clearedAt),
    participant: thread.participant,
  };
};

const mergeMessages = (
  existing: AdminChatMessage[],
  incoming: AdminChatMessage[]
) => {
  if (incoming.length === 0) {
    return existing;
  }
  const map = new Map<string, AdminChatMessage>();
  for (const message of existing) {
    map.set(message.id, message);
  }
  for (const message of incoming) {
    map.set(message.id, message);
  }
  return Array.from(map.values())
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-messageCacheLimit);
};

const channelForThread = (tenantId: string, thread: ThreadSummary) =>
  thread.type === "team"
    ? `tenant:${tenantId}:admin-chat`
    : `tenant:${tenantId}:admin-chat:thread:${thread.id}`;

const getThreadPreview = (thread: ThreadSummary) => {
  if (
    thread.clearedAt &&
    (!thread.lastMessageAt || thread.lastMessageAt <= thread.clearedAt)
  ) {
    return "History cleared";
  }
  if (!thread.lastMessage) {
    return "No messages yet";
  }
  return thread.lastMessage.text;
};

const isClearedForThread = (thread: ThreadSummary) =>
  Boolean(
    thread.clearedAt &&
      (!thread.lastMessageAt || thread.lastMessageAt <= thread.clearedAt)
  );

const avatarFallback = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const readErrorMessage = async (response: Response, fallback: string) => {
  const data = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (data?.message) {
    return data.message;
  }
  return fallback;
};

export function AdministrativeChatClient({
  tenantId,
  employeeId,
}: AdministrativeChatClientProps) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStartingDirect, setIsStartingDirect] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
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
      } catch (connectionError) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[AdministrativeChat] Initialization error:",
            connectionError
          );
        }
      }
    };

    initializeConnection().catch((connectionError) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[AdministrativeChat] Connection failed:",
          connectionError
        );
      }
    });

    return () => {
      isMounted = false;
      try {
        channelRef.current?.unsubscribe();
      } catch (cleanupError) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AdministrativeChat] Cleanup error:", cleanupError);
        }
      }
    };
  }, [tenantId]);

  useEffect(() => {
    if (!(tenantId && employeeId)) {
      return;
    }

    let isMounted = true;

    const loadThreads = async () => {
      setIsLoadingThreads(true);
      setError(null);

      try {
        const response = await apiFetch("/api/administrative/chat/threads");
        if (!response.ok) {
          const message = await readErrorMessage(
            response,
            "Failed to load threads"
          );
          throw new Error(message);
        }

        const payload = (await response.json()) as ApiThreadResponse;
        const mapped = payload.threads.map(toThreadSummary);

        if (!isMounted) {
          return;
        }

        setThreads(mapped);
        setActiveThreadId(
          (prev) => prev ?? payload.teamThreadId ?? mapped[0]?.id ?? null
        );
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load threads";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoadingThreads(false);
        }
      }
    };

    const loadEmployees = async () => {
      try {
        const response = await apiFetch("/api/staff/employees?isActive=true");
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          employees: EmployeeApiRecord[];
        };
        const mapped = payload.employees
          .map((employee) => ({
            id: employee.id,
            firstName: employee.first_name ?? "",
            lastName: employee.last_name ?? "",
            email: employee.email,
            avatarUrl: employee.avatar_url ?? null,
          }))
          .filter((employee) => employee.id !== employeeId);

        if (!isMounted) {
          return;
        }

        setEmployees(mapped);
      } catch {
        if (isMounted) {
          setEmployees([]);
        }
      }
    };

    loadThreads().catch(() => null);
    loadEmployees().catch(() => null);

    return () => {
      isMounted = false;
    };
  }, [employeeId, tenantId]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      setHasMore(false);
      setNextBefore(null);
      return;
    }

    let isMounted = true;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      setError(null);

      try {
        const response = await apiFetch(
          `/api/administrative/chat/threads/${activeThreadId}/messages?limit=${loadLimit}`
        );

        if (!response.ok) {
          const message = await readErrorMessage(
            response,
            "Failed to load messages"
          );
          throw new Error(message);
        }

        const payload = (await response.json()) as {
          messages: ApiMessage[];
          hasMore: boolean;
          nextBefore: string | null;
        };

        const mapped = payload.messages.map((message) =>
          toApiMessage(message, employeeId)
        );

        if (!isMounted) {
          return;
        }

        setMessages(mapped);
        setHasMore(payload.hasMore);
        setNextBefore(payload.nextBefore);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load messages";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    };

    loadMessages().catch(() => null);

    return () => {
      isMounted = false;
    };
  }, [activeThreadId, employeeId]);

  useEffect(() => {
    if (!(clientRef.current && activeThread && tenantId)) {
      return;
    }

    const channelName = channelForThread(tenantId, activeThread);
    const channel = clientRef.current.channels.get(channelName);
    channelRef.current = channel;

    const handleMessage = (message: Ably.Message) => {
      const parsed = toRealtimeMessage(message, employeeId);
      if (!parsed) {
        return;
      }

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== parsed.threadId) {
            return thread;
          }
          const lastMessage: ThreadMessageSummary = {
            id: parsed.message.id,
            text: parsed.message.text,
            authorName: parsed.message.authorName,
            createdAt: new Date(parsed.message.timestamp),
          };
          return {
            ...thread,
            lastMessage,
            lastMessageAt: lastMessage.createdAt,
          };
        })
      );

      if (parsed.threadId !== activeThread.id) {
        return;
      }

      setMessages((prev) => mergeMessages(prev, [parsed.message]));
    };

    try {
      channel.subscribe(messageName, handleMessage);
    } catch (subscribeError) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[AdministrativeChat] Subscription error:",
          subscribeError
        );
      }
    }

    return () => {
      try {
        channel.unsubscribe(messageName, handleMessage);
      } catch (unsubscribeError) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[AdministrativeChat] Unsubscribe error:",
            unsubscribeError
          );
        }
      }
    };
  }, [activeThread, employeeId, tenantId]);

  const handleSend = async () => {
    if (!activeThreadId) {
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    setIsSending(true);
    setDraft("");
    setError(null);

    try {
      const response = await apiFetch(
        `/api/administrative/chat/threads/${activeThreadId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        }
      );

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to send message"
        );
        throw new Error(message);
      }

      const payload = (await response.json()) as ApiMessage;
      const mapped = toApiMessage(payload, employeeId);
      setMessages((prev) => mergeMessages(prev, [mapped]));
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== activeThreadId) {
            return thread;
          }
          const lastMessage: ThreadMessageSummary = {
            id: mapped.id,
            text: mapped.text,
            authorName: mapped.authorName,
            createdAt: new Date(mapped.timestamp),
          };
          return {
            ...thread,
            lastMessage,
            lastMessageAt: lastMessage.createdAt,
          };
        })
      );
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Failed to send message";
      setError(message);
      setDraft(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadMore = async () => {
    if (!(activeThreadId && nextBefore && !isLoadingMore)) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const response = await apiFetch(
        `/api/administrative/chat/threads/${activeThreadId}/messages?limit=${loadLimit}&before=${encodeURIComponent(
          nextBefore
        )}`
      );

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to load more messages"
        );
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        messages: ApiMessage[];
        hasMore: boolean;
        nextBefore: string | null;
      };

      const mapped = payload.messages.map((message) =>
        toApiMessage(message, employeeId)
      );

      setMessages((prev) => mergeMessages(prev, mapped));
      setHasMore(payload.hasMore);
      setNextBefore(payload.nextBefore);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load more messages";
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleStartDirect = async () => {
    if (!selectedEmployeeId) {
      return;
    }

    setIsStartingDirect(true);
    setError(null);

    try {
      const response = await apiFetch("/api/administrative/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: selectedEmployeeId }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to start direct message"
        );
        throw new Error(message);
      }

      const payload = (await response.json()) as ApiThreadSummary;
      const mapped = toThreadSummary(payload);

      setThreads((prev) => {
        const existing = prev.find((thread) => thread.id === mapped.id);
        if (existing) {
          return prev.map((thread) =>
            thread.id === mapped.id ? { ...thread, ...mapped } : thread
          );
        }
        const team = prev.find((thread) => thread.type === "team") ?? null;
        const direct = prev.filter((thread) => thread.type === "direct");
        return team ? [team, mapped, ...direct] : [mapped, ...direct];
      });

      if (clientRef.current) {
        try {
          await clientRef.current.auth.authorize();
        } catch (authorizeError) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[AdministrativeChat] Re-auth failed:",
              authorizeError
            );
          }
        }
      }

      setActiveThreadId(mapped.id);
      setSelectedEmployeeId("");
    } catch (startError) {
      const message =
        startError instanceof Error
          ? startError.message
          : "Failed to start direct message";
      setError(message);
    } finally {
      setIsStartingDirect(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!activeThread) {
      return;
    }

    const action = activeThread.archivedAt ? "unarchive" : "archive";
    setError(null);

    try {
      const response = await apiFetch(
        `/api/administrative/chat/threads/${activeThread.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to update thread"
        );
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        archivedAt: string | null;
        clearedAt: string | null;
      };

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== activeThread.id) {
            return thread;
          }
          return {
            ...thread,
            archivedAt: parseDate(payload.archivedAt),
            clearedAt: parseDate(payload.clearedAt),
          };
        })
      );
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Update failed";
      setError(message);
    }
  };

  const handleClear = async () => {
    if (!activeThread) {
      return;
    }

    setError(null);

    try {
      const response = await apiFetch(
        `/api/administrative/chat/threads/${activeThread.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clear" }),
        }
      );

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Failed to clear history"
        );
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        archivedAt: string | null;
        clearedAt: string | null;
      };

      setMessages([]);
      setHasMore(false);
      setNextBefore(null);
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== activeThread.id) {
            return thread;
          }
          return {
            ...thread,
            archivedAt: parseDate(payload.archivedAt),
            clearedAt: parseDate(payload.clearedAt),
          };
        })
      );
    } catch (clearError) {
      const message =
        clearError instanceof Error ? clearError.message : "Clear failed";
      setError(message);
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

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chat error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Threads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Select
                onValueChange={setSelectedEmployeeId}
                value={selectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Start a direct message" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <SelectItem disabled value="empty">
                      No active employees
                    </SelectItem>
                  ) : (
                    employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {formatDisplayName(employee)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                disabled={!selectedEmployeeId || isStartingDirect}
                onClick={handleStartDirect}
                variant="secondary"
              >
                {isStartingDirect ? "Starting..." : "Start direct message"}
              </Button>
            </div>

            {isLoadingThreads ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : threads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                No threads yet. Start a direct message to begin.
              </div>
            ) : (
              <ScrollArea className="h-[420px] pr-2">
                <div className="space-y-2">
                  {threads.map((thread) => {
                    const isActive = thread.id === activeThreadId;
                    const preview = getThreadPreview(thread);
                    const timestamp = thread.lastMessageAt
                      ? thread.lastMessageAt.getTime()
                      : undefined;
                    return (
                      <button
                        className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition ${
                          isActive
                            ? "border-primary/60 bg-primary/5"
                            : "border-transparent hover:border-border hover:bg-muted/40"
                        }`}
                        key={thread.id}
                        onClick={() => setActiveThreadId(thread.id)}
                        type="button"
                      >
                        {thread.participant ? (
                          <Avatar className="mt-0.5 h-8 w-8">
                            <AvatarImage
                              alt={thread.title}
                              src={thread.participant.avatarUrl ?? undefined}
                            />
                            <AvatarFallback>
                              {avatarFallback(thread.title)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            T
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {thread.title}
                            </p>
                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              {formatTime(timestamp)}
                            </span>
                          </div>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {preview}
                          </p>
                          {thread.archivedAt ? (
                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Archived
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[520px] flex-col">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>{activeThread?.title ?? "Team thread"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {activeThread?.type === "direct"
                    ? "Direct messages are private to participants."
                    : "Team updates for leadership and operations."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={!activeThread}
                  onClick={handleArchiveToggle}
                  size="sm"
                  variant="outline"
                >
                  {activeThread?.archivedAt ? "Unarchive" : "Archive"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={!activeThread} size="sm" variant="ghost">
                      Clear history
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear this thread?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This hides all previous messages for you. Other
                        participants still see the history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClear}>
                        Clear history
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="flex-1 space-y-3">
              {isLoadingMessages ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  {activeThread && isClearedForThread(activeThread)
                    ? "History cleared. New messages will appear here."
                    : "No messages yet. Start the conversation."}
                </div>
              ) : (
                <div className="space-y-3">
                  {hasMore ? (
                    <div className="flex justify-center">
                      <Button
                        disabled={isLoadingMore}
                        onClick={handleLoadMore}
                        size="sm"
                        variant="ghost"
                      >
                        {isLoadingMore ? "Loading..." : "Load earlier messages"}
                      </Button>
                    </div>
                  ) : null}
                  {messages.map((message) => (
                    <div
                      className={`rounded-lg border p-3 ${
                        message.fromMe
                          ? "border-transparent bg-primary/10"
                          : "border-border"
                      }`}
                      key={message.id}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {message.authorName}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {message.text}
                      </p>
                    </div>
                  ))}
                </div>
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
                <Button
                  disabled={!draft.trim() || isSending || !activeThreadId}
                  onClick={handleSend}
                >
                  {isSending ? "Sending..." : "Send update"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
