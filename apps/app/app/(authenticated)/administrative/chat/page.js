"use client";

Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const react_1 = require("react");
const threads = [
  {
    id: "thread-1",
    title: "Battle Board sync",
    participants: "Command + Events",
    updatedAt: "2 min ago",
    unread: 2,
  },
  {
    id: "thread-2",
    title: "Kitchen waste action",
    participants: "Ops + Kitchen",
    updatedAt: "12 min ago",
    unread: 0,
  },
  {
    id: "thread-3",
    title: "Payroll approvals",
    participants: "Finance",
    updatedAt: "1 hr ago",
    unread: 1,
  },
];
const initialConversations = {
  "thread-1": [
    {
      id: "msg-1",
      author: "Dom",
      text: "Recalculating CPM triggered a host of alerts. Are we okay pushing service start by 10 minutes?",
      time: "02:10 PM",
    },
    {
      id: "msg-2",
      author: "You",
      text: "We can absorb the change. Notifying Kitchen and Command Board now.",
      time: "02:12 PM",
      fromMe: true,
    },
  ],
  "thread-2": [
    {
      id: "msg-3",
      author: "Priya",
      text: "Can we get a new supplier for microgreens? This batch arrived bruised.",
      time: "01:58 PM",
    },
    {
      id: "msg-4",
      author: "You",
      text: "Updating the Purchasing board. Please log exact variance in waste tracker.",
      time: "01:59 PM",
      fromMe: true,
    },
  ],
  "thread-3": [
    {
      id: "msg-5",
      author: "Finance Ops",
      text: "Payout file 712 is waiting for your approval before midnight.",
      time: "01:15 PM",
    },
  ],
};
const AdministrativeChatPage = () => {
  const [selectedThreadId, setSelectedThreadId] = (0, react_1.useState)(
    threads[0].id
  );
  const [draft, setDraft] = (0, react_1.useState)("");
  const [conversations, setConversations] = (0, react_1.useState)(
    initialConversations
  );
  const currentMessages = conversations[selectedThreadId] ?? [];
  const handleSend = () => {
    if (!draft.trim()) {
      return;
    }
    const newMessage = {
      id: `msg-${Date.now()}`,
      author: "You",
      text: draft.trim(),
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      fromMe: true,
    };
    setConversations((prev) => ({
      ...prev,
      [selectedThreadId]: [...(prev[selectedThreadId] ?? []), newMessage],
    }));
    setDraft("");
  };
  const currentThread = (0, react_1.useMemo)(
    () => threads.find((thread) => thread.id === selectedThreadId),
    [selectedThreadId]
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Operational Chat</card_1.CardTitle>
          <p className="text-xs text-muted-foreground">
            Keep teams aligned with context-aware threads.
          </p>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-3">
          {threads.map((thread) => (
            <button
              className={`w-full rounded-md border px-3 py-3 text-left transition outline-none focus:border-primary ${
                selectedThreadId === thread.id
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/50 bg-card"
              }`}
              key={thread.id}
              onClick={() => setSelectedThreadId(thread.id)}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{thread.title}</p>
                {thread.unread > 0 && (
                  <badge_1.Badge>{thread.unread}</badge_1.Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {thread.participants}
              </p>
              <p className="text-xs text-muted-foreground">
                {thread.updatedAt}
              </p>
            </button>
          ))}
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card className="flex flex-col">
        <card_1.CardHeader>
          <card_1.CardTitle>
            {currentThread?.title ?? "Select a thread"}
          </card_1.CardTitle>
          <p className="text-xs text-muted-foreground">
            {currentThread?.participants ?? "Waiting for selection"}
          </p>
        </card_1.CardHeader>
        <card_1.CardContent className="flex flex-col gap-3">
          <div className="space-y-3">
            {currentMessages.map((message) => (
              <div
                className={`rounded-lg border p-3 ${message.fromMe ? "border-transparent bg-primary/10" : "border-border"}`}
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
            ))}
          </div>
          <div className="space-y-2">
            <textarea_1.Textarea
              className="min-h-[120px]"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Send a quick update..."
              value={draft}
            />
            <div className="flex justify-end">
              <button_1.Button disabled={!draft.trim()} onClick={handleSend}>
                Send update
              </button_1.Button>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  );
};
exports.default = AdministrativeChatPage;
