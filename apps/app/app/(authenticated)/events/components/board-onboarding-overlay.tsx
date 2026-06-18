"use client";

import { useAuth } from "@clerk/nextjs";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { GitBranch, Pencil, Swords } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * BoardOnboardingOverlay — one-time, per-user explainer for the two event
 * orchestration surfaces that developers (per AGENTS.md "BOARD DISAMBIGUATION")
 * and end users routinely confuse.
 *
 * Shows a single-screen overlay on first visit explaining what the surface does
 * and — critically — how the Command Board's draft → commit model differs from
 * the Battle Board's live edits. Dismissal persists in localStorage keyed by
 * Clerk user id, so it is per-user (not per-session) and survives reloads.
 *
 * This is pure UI orchestration: no governed state is mutated (constitution §4
 * "UI and Command Board"). The dismissal flag is a UI preference, not a
 * semantic event.
 */

type BoardSurface = "command-board" | "battle-board";

interface SurfaceCopy {
  /** Lucide icon for the header. */
  Icon: typeof GitBranch;
  /** Primary call-to-action label. */
  cta: string;
  /** How draft-commit differs from live edits — the key teaching point. */
  editModelNote: string;
  /** One-line description of what the surface is for. */
  summary: string;
  title: string;
}

const SURFACE_COPY: Record<BoardSurface, SurfaceCopy> = {
  "command-board": {
    Icon: GitBranch,
    cta: "Start planning",
    editModelNote:
      "Everything you add starts as a draft. Nothing touches the live event until you click Review & Commit — so plan and experiment freely.",
    summary:
      "Your event's planning tree. Drag staff and dishes from the palette onto the tree to shape the event before it goes live.",
    title: "Welcome to the Command Board",
  },
  "battle-board": {
    Icon: Swords,
    cta: "Got it",
    editModelNote:
      "Unlike the Command Board's draft-and-commit flow, edits here go live the moment you hit Save. This is the final, on-the-ground plan for the day.",
    summary:
      "Your day-of execution sheet — staff assignments, timeline, and floor layouts for running the event on-site.",
    title: "Welcome to the Battle Board",
  },
};

const STORAGE_PREFIX = "capsule-board-onboarding";

function storageKey(surface: BoardSurface, userId: string): string {
  return `${STORAGE_PREFIX}:${userId}:${surface}:dismissed`;
}

interface BoardOnboardingOverlayProps {
  surface: BoardSurface;
}

export function BoardOnboardingOverlay({
  surface,
}: BoardOnboardingOverlayProps) {
  const { isLoaded, userId } = useAuth();
  const [open, setOpen] = useState(false);

  // Decide visibility only after Clerk resolves the user, and only on the
  // client (localStorage is unavailable during SSR). Keying the flag by userId
  // makes dismissal per-user, not per-browser — a second user on the same
  // device still gets the explainer once.
  useEffect(() => {
    if (!isLoaded || !userId || typeof window === "undefined") {
      return;
    }
    const dismissed =
      window.localStorage.getItem(storageKey(surface, userId)) === "true";
    if (!dismissed) {
      setOpen(true);
    }
  }, [isLoaded, userId, surface]);

  // Any close path (CTA, X button, Escape, overlay click) persists the
  // dismissal so the overlay never reappears for this user on this surface.
  const dismiss = () => {
    if (userId && typeof window !== "undefined") {
      window.localStorage.setItem(storageKey(surface, userId), "true");
    }
    setOpen(false);
  };

  const copy = SURFACE_COPY[surface];
  const { Icon } = copy;

  return (
    <Dialog onOpenChange={(next) => !next && dismiss()} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:mx-0">
            <Icon className="size-6" />
          </div>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.summary}</DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <Pencil className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">{copy.editModelNote}</p>
        </div>

        <DialogFooter>
          <Button autoFocus className="w-full sm:w-auto" onClick={dismiss}>
            {copy.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
