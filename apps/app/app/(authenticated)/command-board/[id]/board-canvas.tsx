"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { LayoutDashboard, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BoardCanvasProps {
  readonly boardId: string;
  readonly cards: ReadonlyArray<{
    id: string;
    title: string;
    cardType: string;
    status: string;
    positionX: number;
    positionY: number;
  }>;
}

const ENTITY_CATEGORIES = [
  { id: "events", label: "Events" },
  { id: "clients", label: "Clients" },
  { id: "tasks", label: "Tasks" },
  { id: "staff", label: "Staff" },
  { id: "shipments", label: "Logistics" },
];

export const BoardCanvas = ({ boardId: _boardId, cards }: BoardCanvasProps) => {
  const [browserOpen, setBrowserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard shortcut: Ctrl/Cmd+E toggles entity browser
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setBrowserOpen((prev) => !prev);
      }
      if (event.key === "Escape" && browserOpen) {
        setBrowserOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [browserOpen]);

  return (
    <div className="relative flex h-[calc(100vh-12rem)] min-h-[480px] gap-0 overflow-hidden rounded-xl border border-border bg-background">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <Button
          onClick={() => setBrowserOpen((prev) => !prev)}
          size="sm"
          title="Browse Entities (Ctrl+E)"
          variant="outline"
        >
          <Search className="mr-2 h-4 w-4" />
          Browse entities
        </Button>
      </div>

      {/* Canvas */}
      <div
        aria-label="Command board canvas - drag entities here to add them"
        className="flex-1 overflow-auto bg-muted/20"
        role="application"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {cards.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">Empty canvas</p>
              <p className="max-w-sm text-muted-foreground text-xs">
                Open the entity browser to add events, clients, tasks, staff or
                deliveries to this board.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full">
            {cards.map((card) => (
              <article
                className="absolute w-[280px] rounded-lg border border-border bg-card p-3 shadow-sm"
                key={card.id}
                style={{
                  left: card.positionX,
                  top: card.positionY,
                }}
              >
                <header className="mb-2 flex items-start justify-between gap-2">
                  <h4 className="line-clamp-2 font-medium text-sm leading-tight">
                    {card.title}
                  </h4>
                </header>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                  {card.cardType} · {card.status}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Entity Browser Panel */}
      {browserOpen ? (
        <section
          aria-label="Entity Browser"
          className="flex w-[272px] flex-col border-border border-l bg-card"
        >
          <header className="flex items-center justify-between border-border border-b p-3">
            <h3 className="font-medium text-sm">Entity browser</h3>
            <Button
              aria-label="Close entity browser"
              onClick={() => setBrowserOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="border-border border-b p-3">
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                aria-label="Search entities"
                className="w-full rounded-md border border-input bg-background py-1.5 pr-2 pl-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search…"
                type="text"
                value={searchQuery}
              />
            </div>
          </div>
          <ul className="flex-1 overflow-auto p-2">
            {ENTITY_CATEGORIES.map((category) => (
              <li key={category.id}>
                <button
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  type="button"
                >
                  {category.label}
                </button>
              </li>
            ))}
          </ul>
          <footer className="border-border border-t p-3">
            <p className="text-muted-foreground text-xs">
              Press <kbd className="rounded bg-muted px-1">Esc</kbd> to close,{" "}
              <kbd className="rounded bg-muted px-1">Ctrl+E</kbd> to toggle.
            </p>
          </footer>
        </section>
      ) : null}
    </div>
  );
};
