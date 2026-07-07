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
 * BoardOnboardingOverlay — one-time, per-user explainer for Event-tree vs Battle Board
 * (see VISION.md board taxonomy). Developers and end users confuse these when both
 * are called "board".
 *
 * Event-tree: setup, draft → commit. Battle Board: day-of execution, live saves.
 * Dismissal persists in localStorage keyed by Clerk user id.
 */

type BoardSurface = "event-tree" | "battle-board";

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
  "event-tree": {
    Icon: GitBranch,
    cta: "Start planning",
    editModelNote:
      "Everything you add starts as a draft. Nothing reaches the Battle Board until you click Review & Commit — so plan and experiment freely.",
    summary:
      "Assemble this event: staff, menu, vehicles, and details on the tree. Your commits flow automatically into the Battle Board.",
    title: "Welcome to the Event tree",
  },
  "battle-board": {
    Icon: Swords,
    cta: "Got it",
    editModelNote:
      "Unlike the Event tree's draft-and-commit flow, edits here go live when you save. This is how the event runs on the day.",
    summary:
      "Day-of execution — timeline, stations, dishes, prep and service flow, and floor assignments for this event.",
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
