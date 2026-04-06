"use client";

import { SparklesIcon, XIcon } from "lucide-react";
import { useAiAssistant } from "./ai-assistant-provider";

export function AiAssistantButton() {
  const { isOpen, toggle } = useAiAssistant();

  return (
    <button
      aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all duration-150"
      onClick={toggle}
      style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.18)" }}
      type="button"
    >
      <span
        aria-hidden={isOpen}
        className="absolute inset-0 flex items-center justify-center transition-all duration-200"
        style={{
          opacity: isOpen ? 0 : 1,
          transform: isOpen
            ? "rotate(90deg) scale(0.5)"
            : "rotate(0deg) scale(1)",
        }}
      >
        <SparklesIcon className="h-6 w-6" />
      </span>
      <span
        aria-hidden={!isOpen}
        className="absolute inset-0 flex items-center justify-center transition-all duration-200"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen
            ? "rotate(0deg) scale(1)"
            : "rotate(-90deg) scale(0.5)",
        }}
      >
        <XIcon className="h-6 w-6" />
      </span>
    </button>
  );
}
