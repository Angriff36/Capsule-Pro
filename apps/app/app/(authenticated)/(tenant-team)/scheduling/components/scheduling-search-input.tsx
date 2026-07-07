"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function SchedulingSearchInput() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && query.trim()) {
        router.push(
          `/scheduling/shifts?search=${encodeURIComponent(query.trim())}`
        );
      }
    },
    [query, router]
  );

  useEffect(() => {
    const handleGlobal = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleGlobal);
    return () => document.removeEventListener("keydown", handleGlobal);
  }, []);

  return (
    <div className="relative w-full max-w-[280px] sm:w-[280px]">
      <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/60" />
      <Input
        className="border-white/25 bg-transparent pr-12 pl-9 text-white placeholder:text-white/50 focus-visible:border-white/60 focus-visible:ring-white/20"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search shifts, people, roles…"
        ref={inputRef}
        value={query}
      />
      <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-white/25 px-2 py-1 font-mono text-[10px] text-white/70 uppercase tracking-[0.18em]">
        ⌘K
      </span>
    </div>
  );
}
