"use client";

import { Info } from "lucide-react";
import type * as React from "react";
import { cn } from "@repo/design-system/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";

/**
 * Props for {@link FieldHint}.
 *
 * @public
 */
export interface FieldHintProps {
  /**
   * One or more rule descriptions to surface on hover/focus. Pass an array of
   * {@link ManifestFieldHint} (from `getFieldHint`) or plain strings. When
   * empty/null, the component renders nothing.
   */
  hints:
    | string
    | string[]
    | { message: string; severity?: "block" | "warn" | "info" }[]
    | null
    | undefined;
  /** Tooltip placement. Defaults to "top". */
  side?: React.ComponentProps<typeof TooltipContent>["side"];
  /** Extra classes on the icon trigger. */
  className?: string;
  /** Accessible label for the trigger (defaults to "Learn more"). */
  label?: string;
}

/**
 * A small info icon that reveals Manifest policy/constraint text on hover or
 * keyboard focus. Drop it next to a form label to surface why a field is
 * governed, e.g. "Deposit amount must be non-negative".
 *
 * Renders nothing when `hints` is empty — safe to always wire in, no conditionals.
 *
 * @example
 *   <FormLabel>
 *     Total Budget <FieldHint hints={getFieldHint("EventBudget", "totalBudgetAmount")} />
 *   </FormLabel>
 *
 * @public
 */
export function FieldHint({
  hints,
  side = "top",
  className,
  label = "Learn more",
}: FieldHintProps) {
  const messages = normalizeHints(hints);
  if (messages.length === 0) return null;

  const hasBlock = messages.some(
    (m): m is { message: string; severity: "block" } =>
      typeof m !== "string" && m.severity === "block"
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger
          aria-label={label}
          className={cn(
            "inline-flex size-3.5 translate-y-px cursor-help items-center justify-center rounded-full outline-none transition-colors",
            "text-muted-foreground hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            className
          )}
          type="button"
        >
          <Info
            aria-hidden="true"
            className={cn("size-3.5", hasBlock && "text-amber-500 dark:text-amber-400")}
            strokeWidth={2.25}
          />
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs whitespace-normal text-left">
          {messages.length === 1 ? (
            <HintLine hint={messages[0]} />
          ) : (
            <ul className="space-y-1">
              {messages.map((hint, index) => (
                <li key={index} className="flex gap-1.5">
                  <span aria-hidden="true">{index + 1}.</span>
                  <span>
                    <HintLine hint={hint} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type NormalizedHint = string | { message: string; severity?: "block" | "warn" | "info" };

function normalizeHints(hints: FieldHintProps["hints"]): NormalizedHint[] {
  if (!hints) return [];
  if (typeof hints === "string") {
    return hints.trim() ? [hints.trim()] : [];
  }
  if (Array.isArray(hints)) {
    return hints
      .map((h) => (typeof h === "string" ? (h.trim() ? h.trim() : null) : h))
      .filter((h): h is NonNullable<NormalizedHint> => h !== null && h !== "");
  }
  return [];
}

function HintLine({ hint }: { hint: NormalizedHint }) {
  if (typeof hint === "string") return <>{hint}</>;
  const severity = hint.severity ?? "info";
  if (severity === "block") {
    return (
      <>
        <span className="font-semibold">Required:</span> {hint.message}
      </>
    );
  }
  if (severity === "warn") {
    return (
      <>
        <span className="font-semibold">Heads up:</span> {hint.message}
      </>
    );
  }
  return <>{hint.message}</>;
}
