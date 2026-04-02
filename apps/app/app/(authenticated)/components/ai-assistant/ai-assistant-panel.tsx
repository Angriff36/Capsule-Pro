"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChevronDownIcon, MinusIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getModulePrompts } from "./module-prompts";
import { useAiAssistant } from "./ai-assistant-provider";

export function AiAssistantPanel() {
  const { isOpen, isMinimized, currentModule, close, minimize } = useAiAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/command-board/chat",
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";
  const quickPrompts = getModulePrompts(currentModule);
  const isEmpty = messages.length === 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage({ text: trimmed });
    setInput("");
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const formatModuleLabel = (key: string) =>
    key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const panelTranslate = !isOpen
    ? "translate-y-4 opacity-0 pointer-events-none"
    : isMinimized
      ? "translate-y-[calc(100%-52px)]"
      : "translate-y-0 opacity-100";

  return (
    <div
      className={`fixed bottom-6 right-20 z-50 flex flex-col w-[400px] max-md:w-full max-md:right-0 max-md:left-0 max-md:bottom-0 max-md:rounded-b-none h-[600px] max-md:h-[80vh] rounded-2xl shadow-2xl border bg-background overflow-hidden transition-all duration-200 ${panelTranslate}`}
      style={{ visibility: isOpen ? "visible" : "hidden" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Capsule AI</span>
          <Badge variant="secondary" className="text-xs capitalize">
            {formatModuleLabel(currentModule)}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={minimize}
            aria-label={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <MinusIcon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={close}
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col gap-3 h-full justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Ask me anything about {formatModuleLabel(currentModule)}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickPrompts.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => {
              const textContent = m.parts
                ?.filter((p) => p.type === "text")
                .map((p) => ("text" in p ? (p.text as string) : ""))
                .join("") ?? "";

              if (!textContent && m.role !== "user") return null;

              const displayText =
                m.role === "user"
                  ? textContent
                  : textContent;

              if (!displayText) return null;

              return (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted AI response formatted as HTML
                        dangerouslySetInnerHTML={{
                          __html: formatMessageContent(displayText),
                        }}
                      />
                    ) : (
                      <span>{displayText}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground">
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t px-3 py-2 shrink-0 bg-background">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… (⌘↵ to send)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px] max-h-[120px]"
          />
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-9 w-9 shrink-0"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatMessageContent(content: string): string {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}
