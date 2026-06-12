"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getModuleKeyFromPathname, type ModuleKey } from "../module-nav";

interface AiAssistantContextValue {
  close: () => void;
  currentModule: ModuleKey;
  isMinimized: boolean;
  isOpen: boolean;
  minimize: () => void;
  open: () => void;
  toggle: () => void;
}

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const pathname = usePathname();
  const currentModule = getModuleKeyFromPathname(pathname ?? "/");

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        return false;
      }
      setIsMinimized(false);
      return true;
    });
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const minimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return (
    <AiAssistantContext.Provider
      value={{
        isOpen,
        isMinimized,
        currentModule,
        toggle,
        open,
        close,
        minimize,
      }}
    >
      {children}
    </AiAssistantContext.Provider>
  );
}

export function useAiAssistant(): AiAssistantContextValue {
  const ctx = useContext(AiAssistantContext);
  if (!ctx) {
    throw new Error("useAiAssistant must be used within AiAssistantProvider");
  }
  return ctx;
}
