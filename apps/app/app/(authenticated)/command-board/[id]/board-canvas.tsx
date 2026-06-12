"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  LayoutDashboard,
  Maximize2,
  Minimize2,
  Search,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  assignToGroupAction,
  bulkRestoreCardsAction,
  bulkUpdateCardsAction,
  createGroupAction,
  deleteGroupAction,
  moveCardAction,
  toggleGroupCollapseAction,
  ungroupCardsAction,
} from "../actions";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface CardData {
  readonly cardType: string;
  readonly color: string | null;
  readonly groupId: string | null;
  readonly height: number;
  readonly id: string;
  readonly positionX: number;
  readonly positionY: number;
  readonly status: string;
  readonly title: string;
  readonly width: number;
}

interface ConnectionData {
  readonly fromCardId: string;
  readonly id: string;
  readonly label: string | null;
  readonly relationshipType: string;
  readonly toCardId: string;
}

interface GroupData {
  readonly collapsed: boolean;
  readonly color: string | null;
  readonly height: number;
  readonly id: string;
  readonly name: string;
  readonly positionX: number;
  readonly positionY: number;
  readonly width: number;
}

interface BoardCanvasProps {
  readonly boardId: string;
  readonly cards: readonly CardData[];
  readonly connections: readonly ConnectionData[];
  readonly groups: readonly GroupData[];
}

interface PreviewData {
  readonly affectedCards: readonly CardData[];
  readonly summary: ReadonlyArray<{
    property: string;
    from: string;
    to: string;
    count: number;
  }>;
  readonly updates: Record<string, string>;
  readonly warnings: readonly string[];
}

interface UndoEntry {
  cards: Array<{
    id: string;
    status: string;
    color: string | null;
    cardType: string;
  }>;
  description: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", accent: "#3b82f6" },
  { value: "emerald", label: "Green", accent: "#10b981" },
  { value: "amber", label: "Amber", accent: "#f59e0b" },
  { value: "red", label: "Red", accent: "#ef4444" },
  { value: "violet", label: "Purple", accent: "#8b5cf6" },
  { value: "slate", label: "Slate", accent: "#64748b" },
] as const;

const GROUP_COLORS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#64748b", label: "Slate" },
] as const;

const ENTITY_CATEGORIES = [
  { id: "events", label: "Events" },
  { id: "clients", label: "Clients" },
  { id: "tasks", label: "Tasks" },
  { id: "staff", label: "Staff" },
  { id: "shipments", label: "Logistics" },
];

/* -------------------------------------------------------------------------- */
/*  Status badge helper                                                       */
/* -------------------------------------------------------------------------- */

const statusStyle = (status: string): string => {
  switch (status) {
    case "done":
      return "bg-emerald-100 text-emerald-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const VALID_STATUSES = ["pending", "in_progress", "done", "cancelled"];

function groupBy<T>(
  items: readonly T[],
  key: (item: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = map.get(k) ?? [];
    group.push(item);
    map.set(k, group);
  }
  return map;
}

function validateStatusChange(
  newStatus: string,
  cards: readonly CardData[]
): string[] {
  const warnings: string[] = [];
  if (!VALID_STATUSES.includes(newStatus)) {
    warnings.push(`"${newStatus}" is not a valid status.`);
  }
  const doneCount = cards.filter((c) => c.status === "done").length;
  if (doneCount > 0 && newStatus !== "done") {
    warnings.push(
      `${doneCount} card${doneCount === 1 ? "" : "s"} already marked "done". Changing status may affect reporting.`
    );
  }
  return warnings;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export const BoardCanvas = ({
  boardId,
  cards: initialCards,
  connections: initialConnections,
  groups: initialGroups,
}: BoardCanvasProps) => {
  /* ---- local mutable state ---- */
  const [localCards, setLocalCards] = useState<CardData[]>([...initialCards]);
  const [localGroups, setLocalGroups] = useState<GroupData[]>([
    ...initialGroups,
  ]);

  /* ---- selection ---- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ---- drag ---- */
  const [drag, setDrag] = useState<{
    cardId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  /* ---- bulk edit ---- */
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkColor, setBulkColor] = useState("");
  const [applying, setApplying] = useState(false);

  /* ---- bulk edit preview & undo ---- */
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const undoRef = useRef<UndoEntry[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  /* ---- group creation ---- */
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState<string>(
    GROUP_COLORS[0].value
  );
  const [creatingGroup, setCreatingGroup] = useState(false);

  /* ---- entity browser ---- */
  const [browserOpen, setBrowserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrowserCategoryId, setSelectedBrowserCategoryId] = useState<
    string | null
  >(null);

  /* ---- delete group confirmation ---- */
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  /* ---- ref for scroll container ---- */
  const canvasRef = useRef<HTMLDivElement>(null);

  /* ---- sync from server on prop change ---- */
  useEffect(() => {
    setLocalCards([...initialCards]);
  }, [initialCards]);

  useEffect(() => {
    setLocalGroups([...initialGroups]);
  }, [initialGroups]);

  /* ------------------------------------------------------------------ */
  /*  Undo handler                                                       */
  /* ------------------------------------------------------------------ */

  const handleUndo = useCallback(async () => {
    const previous = undoRef.current.pop();
    if (!previous) {
      return;
    }
    setUndoCount((c) => Math.max(0, c - 1));
    setLocalCards((prev) =>
      prev.map((c) => {
        const prevCard = previous.cards.find((p) => p.id === c.id);
        if (!prevCard) {
          return c;
        }
        return {
          ...c,
          status: prevCard.status,
          color: prevCard.color,
          cardType: prevCard.cardType,
        };
      })
    );
    await bulkRestoreCardsAction(previous.cards);
    toast.success(`Undone: ${previous.description}`);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Keyboard shortcuts                                                 */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Ctrl/Cmd+Z: undo last bulk edit
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        handleUndo();
        return;
      }
      // Ctrl/Cmd+E toggles entity browser
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setBrowserOpen((prev) => !prev);
        return;
      }

      // Escape: deselect all or close browser
      if (event.key === "Escape") {
        if (browserOpen) {
          setBrowserOpen(false);
        } else {
          setSelectedIds(new Set());
        }
        return;
      }

      // Ctrl/Cmd+A: select all cards
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(new Set(localCards.map((c) => c.id)));
        return;
      }

      // Delete/Backspace: deselect all
      if (event.key === "Delete" || event.key === "Backspace") {
        // Only if no input is focused
        if (
          !(
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLSelectElement
          )
        ) {
          setSelectedIds(new Set());
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [browserOpen, localCards, handleUndo]);

  /* ------------------------------------------------------------------ */
  /*  Drag handlers                                                      */
  /* ------------------------------------------------------------------ */

  const handleCardMouseDown = useCallback(
    (cardId: string, event: React.MouseEvent) => {
      // If shift is held, toggle selection
      if (event.shiftKey) {
        event.preventDefault();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(cardId)) {
            next.delete(cardId);
          } else {
            next.add(cardId);
          }
          return next;
        });
        return;
      }

      // Select only this card
      setSelectedIds(new Set([cardId]));

      // Start drag
      const card = localCards.find((c) => c.id === cardId);
      if (!card) {
        return;
      }

      setDrag({
        cardId,
        offsetX: event.clientX - card.positionX,
        offsetY: event.clientY - card.positionY,
      });
    },
    [localCards]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!drag) {
        return;
      }

      const newX = event.clientX - drag.offsetX;
      const newY = event.clientY - drag.offsetY;

      setLocalCards((prev) =>
        prev.map((c) =>
          c.id === drag.cardId ? { ...c, positionX: newX, positionY: newY } : c
        )
      );
    },
    [drag]
  );

  const handleMouseUp = useCallback(() => {
    if (!drag) {
      return;
    }

    const card = localCards.find((c) => c.id === drag.cardId);
    if (card) {
      // Fire-and-forget server sync
      moveCardAction(card.id, card.positionX, card.positionY).catch(() => {
        /* optimistic — errors handled by refresh */
      });
    }

    setDrag(null);
  }, [drag, localCards]);

  /* ------------------------------------------------------------------ */
  /*  Canvas background click (deselect)                                 */
  /* ------------------------------------------------------------------ */

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    // Only if clicking the canvas background, not a card
    if ((event.target as HTMLElement).closest("[data-card-id]")) {
      return;
    }
    if ((event.target as HTMLElement).closest("[data-group-id]")) {
      return;
    }

    setSelectedIds(new Set());
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Bulk operations                                                    */
  /* ------------------------------------------------------------------ */

  const computePreview = (
    ids: string[],
    updates: Record<string, string>
  ): PreviewData => {
    const affectedCards = localCards.filter((c) => ids.includes(c.id));
    const summary: {
      property: string;
      from: string;
      to: string;
      count: number;
    }[] = [];
    const warnings: string[] = [];

    if (updates.status) {
      warnings.push(...validateStatusChange(updates.status, affectedCards));
      const byOldStatus = groupBy(affectedCards, (c) => c.status);
      for (const [from, cards] of byOldStatus) {
        summary.push({
          property: "Status",
          from,
          to: updates.status,
          count: cards.length,
        });
      }
    }

    if (updates.color) {
      summary.push({
        property: "Color",
        from: "various",
        to: updates.color,
        count: affectedCards.length,
      });
    }

    return { updates, affectedCards, summary, warnings };
  };

  const handleBulkApply = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    const updates: Record<string, string> = {};
    if (bulkStatus) {
      updates.status = bulkStatus;
    }
    if (bulkColor) {
      updates.color = bulkColor;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    setPreviewData(computePreview(ids, updates));
  };

  const handleConfirmBulkEdit = async () => {
    if (!previewData) {
      return;
    }

    const { updates, affectedCards } = previewData;
    const ids = affectedCards.map((c) => c.id);

    // Save snapshot for undo
    undoRef.current.push({
      cards: affectedCards.map((c) => ({
        id: c.id,
        status: c.status,
        color: c.color,
        cardType: c.cardType,
      })),
      description: `Bulk edit: ${Object.keys(updates).join(", ")}`,
    });
    setUndoCount((c) => c + 1);

    setApplying(true);
    try {
      setLocalCards((prev) =>
        prev.map((c) => (ids.includes(c.id) ? { ...c, ...updates } : c))
      );
      await bulkUpdateCardsAction(ids, updates);
      setBulkStatus("");
      setBulkColor("");
    } finally {
      setApplying(false);
      setPreviewData(null);
    }
  };

  const handleCreateGroup = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !newGroupName.trim()) {
      return;
    }

    setCreatingGroup(true);

    try {
      // Calculate group bounds from selected cards
      const selectedCards = localCards.filter((c) => ids.includes(c.id));
      const padding = 40;

      const minX = Math.min(...selectedCards.map((c) => c.positionX)) - padding;
      const minY = Math.min(...selectedCards.map((c) => c.positionY)) - padding;
      const maxX =
        Math.max(...selectedCards.map((c) => c.positionX + c.width)) + padding;
      const maxY =
        Math.max(...selectedCards.map((c) => c.positionY + c.height)) + padding;

      const result = await createGroupAction(
        boardId,
        newGroupName.trim(),
        newGroupColor,
        ids,
        minX,
        minY,
        maxX - minX,
        maxY - minY
      );

      // Optimistic local update
      const newGroup: GroupData = {
        id: result.id,
        name: newGroupName.trim(),
        color: newGroupColor,
        collapsed: false,
        positionX: minX,
        positionY: minY,
        width: maxX - minX,
        height: maxY - minY,
      };

      setLocalGroups((prev) => [...prev, newGroup]);
      setLocalCards((prev) =>
        prev.map((c) => (ids.includes(c.id) ? { ...c, groupId: result.id } : c))
      );

      setShowGroupDialog(false);
      setNewGroupName("");
      setSelectedIds(new Set());
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAssignToGroup = async (groupId: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    // Optimistic
    setLocalCards((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, groupId } : c))
    );

    await assignToGroupAction(ids, groupId);
    setSelectedIds(new Set());
  };

  const handleUngroup = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    // Optimistic
    setLocalCards((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, groupId: null } : c))
    );

    await ungroupCardsAction(ids);
    setSelectedIds(new Set());
  };

  const handleToggleCollapse = async (groupId: string) => {
    const group = localGroups.find((g) => g.id === groupId);
    if (!group) {
      return;
    }

    const newCollapsed = !group.collapsed;

    setLocalGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, collapsed: newCollapsed } : g
      )
    );

    await toggleGroupCollapseAction(groupId, newCollapsed);
  };

  const confirmDeleteGroup = (groupId: string) => {
    setGroupToDelete(groupId);
    setDeleteGroupDialogOpen(true);
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) {
      return;
    }

    const groupId = groupToDelete;
    setDeleteGroupDialogOpen(false);
    setGroupToDelete(null);

    // Optimistic
    setLocalGroups((prev) => prev.filter((g) => g.id !== groupId));
    setLocalCards((prev) =>
      prev.map((c) => (c.groupId === groupId ? { ...c, groupId: null } : c))
    );

    await deleteGroupAction(groupId);
  };

  /* ------------------------------------------------------------------ */
  /*  Render: connection line                                            */
  /* ------------------------------------------------------------------ */

  const renderConnections = () => {
    const cardMap = new Map(localCards.map((c) => [c.id, c]));

    return (
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 1 }}
      >
        {initialConnections.map((conn) => {
          const from = cardMap.get(conn.fromCardId);
          const to = cardMap.get(conn.toCardId);
          if (!(from && to)) {
            return null;
          }

          // Hide connections if either card is in a collapsed group
          const fromGroup = localGroups.find((g) => g.id === from.groupId);
          const toGroup = localGroups.find((g) => g.id === to.groupId);
          if (fromGroup?.collapsed || toGroup?.collapsed) {
            return null;
          }

          const x1 = from.positionX + from.width / 2;
          const y1 = from.positionY + from.height / 2;
          const x2 = to.positionX + to.width / 2;
          const y2 = to.positionY + to.height / 2;

          return (
            <g key={conn.id}>
              <line
                className="text-muted-foreground/40"
                stroke="currentColor"
                strokeWidth={1.5}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
              />
              {/* Arrow head */}
              <circle
                className="fill-muted-foreground/40"
                cx={x2}
                cy={y2}
                r={3}
              />
              {/* Label */}
              {conn.label ? (
                <text
                  className="fill-muted-foreground text-[10px]"
                  textAnchor="middle"
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 4}
                >
                  {conn.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Render: group container                                            */
  /* ------------------------------------------------------------------ */

  const renderGroup = (group: GroupData) => {
    const groupCards = localCards.filter((c) => c.groupId === group.id);
    const borderColor = group.color || "#94a3b8";
    const headerHeight = 32;
    const totalHeight = group.collapsed
      ? headerHeight
      : Math.max(group.height, headerHeight + 20);

    return (
      <div
        className="absolute rounded-lg"
        data-group-id={group.id}
        key={group.id}
        style={{
          left: group.positionX,
          top: group.positionY,
          width: group.width,
          height: totalHeight,
          zIndex: 0,
          border: `2px dashed ${borderColor}`,
          backgroundColor: `${borderColor}08`,
        }}
      >
        {/* Group header */}
        <div
          className="flex items-center justify-between rounded-t-lg px-3"
          style={{
            height: headerHeight,
            backgroundColor: `${borderColor}15`,
            borderBottom: group.collapsed
              ? "none"
              : `1px solid ${borderColor}30`,
          }}
        >
          <div className="flex items-center gap-2">
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => handleToggleCollapse(group.id)}
              title={group.collapsed ? "Expand group" : "Collapse group"}
              type="button"
            >
              {group.collapsed ? (
                <Maximize2 className="h-3 w-3" />
              ) : (
                <Minimize2 className="h-3 w-3" />
              )}
            </button>
            <span className="font-medium text-xs">{group.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {groupCards.length} card{groupCards.length === 1 ? "" : "s"}
            </span>
          </div>
          <button
            className="text-muted-foreground/50 hover:text-destructive"
            onClick={() => confirmDeleteGroup(group.id)}
            title="Delete group"
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Render: card                                                       */
  /* ------------------------------------------------------------------ */

  const renderCard = (card: CardData) => {
    // Hide cards in collapsed groups
    const group = localGroups.find((g) => g.id === card.groupId);
    if (group?.collapsed) {
      return null;
    }

    const isSelected = selectedIds.has(card.id);
    const isDragging = drag?.cardId === card.id;
    const colorAccent = card.color
      ? COLOR_OPTIONS.find((c) => c.value === card.color)?.accent
      : undefined;

    return (
      <article
        className={`absolute w-[220px] cursor-grab rounded-md border bg-card p-3 transition-shadow ${
          isSelected
            ? "border-primary ring-2 ring-primary/30"
            : "border-border hover:border-primary/40"
        } ${isDragging ? "cursor-grabbing opacity-90" : ""}`}
        data-card-id={card.id}
        key={card.id}
        onMouseDown={(e) => handleCardMouseDown(card.id, e)}
        style={{
          left: card.positionX,
          top: card.positionY,
          minHeight: card.height || 80,
          zIndex: isSelected ? 10 : 2,
          borderLeftColor: colorAccent || undefined,
          borderLeftWidth: colorAccent ? "3px" : undefined,
        }}
      >
        <header className="mb-1.5 flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 font-medium text-sm leading-tight">
            {card.title}
          </h4>
        </header>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex rounded px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide ${statusStyle(card.status)}`}
          >
            {card.status}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {card.cardType}
          </span>
        </div>
      </article>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Render: bulk edit toolbar                                          */
  /* ------------------------------------------------------------------ */

  const renderBulkToolbar = () => {
    if (selectedIds.size === 0) {
      return null;
    }

    const ids = Array.from(selectedIds);
    const anyGrouped = ids.some(
      (id) => localCards.find((c) => c.id === id)?.groupId
    );

    return (
      <div className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <span className="font-medium text-xs tabular-nums">
          {selectedIds.size} selected
        </span>

        {undoCount > 0 && (
          <Button onClick={handleUndo} size="sm" variant="ghost">
            <Undo2 className="mr-1 h-3.5 w-3.5" />
            Undo
          </Button>
        )}

        <div className="h-4 w-px bg-border" />

        {/* Status */}
        <select
          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
          onChange={(e) => setBulkStatus(e.target.value)}
          title="Change status"
          value={bulkStatus}
        >
          <option value="">Status…</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Color */}
        <select
          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
          onChange={(e) => setBulkColor(e.target.value)}
          title="Change color"
          value={bulkColor}
        >
          <option value="">Color…</option>
          {COLOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Apply */}
        <Button
          disabled={applying || !(bulkStatus || bulkColor)}
          onClick={handleBulkApply}
          size="sm"
          variant="default"
        >
          {applying ? "Applying…" : "Apply"}
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Group */}
        {selectedIds.size >= 2 ? (
          <Button
            onClick={() => setShowGroupDialog(true)}
            size="sm"
            variant="outline"
          >
            Group
          </Button>
        ) : null}

        {/* Assign to existing group */}
        {localGroups.length > 0 ? (
          <select
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
            onChange={(e) => {
              if (e.target.value) {
                handleAssignToGroup(e.target.value);
              }
            }}
            title="Assign to group"
            value=""
          >
            <option value="">Assign to…</option>
            {localGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : null}

        {/* Ungroup */}
        {anyGrouped ? (
          <Button onClick={handleUngroup} size="sm" variant="ghost">
            Ungroup
          </Button>
        ) : null}

        <div className="h-4 w-px bg-border" />

        {/* Deselect */}
        <button
          className="rounded p-1 hover:bg-accent"
          onClick={() => setSelectedIds(new Set())}
          title="Deselect all (Esc)"
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Render: create group dialog                                        */
  /* ------------------------------------------------------------------ */

  const renderGroupDialog = () => (
    <Dialog onOpenChange={setShowGroupDialog} open={showGroupDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Create group from {selectedIds.size} card
            {selectedIds.size === 1 ? "" : "s"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input
              autoFocus
              id="group-name"
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Front of house"
              value={newGroupName}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  className={`h-8 w-8 rounded-full border-2 ${
                    newGroupColor === color.value
                      ? "border-foreground"
                      : "border-transparent"
                  }`}
                  key={color.value}
                  onClick={() => setNewGroupColor(color.value)}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => setShowGroupDialog(false)}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={creatingGroup || !newGroupName.trim()}
            onClick={handleCreateGroup}
          >
            {creatingGroup ? "Creating…" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  /* ------------------------------------------------------------------ */
  /*  Render: bulk edit preview dialog                                   */
  /* ------------------------------------------------------------------ */

  const renderPreviewDialog = () => {
    if (!previewData) {
      return null;
    }

    return (
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setPreviewData(null);
          }
        }}
        open={!!previewData}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              {previewData.affectedCards.length} card
              {previewData.affectedCards.length === 1 ? "" : "s"} will be
              updated:
            </p>
            <div className="space-y-2">
              {previewData.summary.map((item, i) => (
                <div className="flex items-center gap-2 text-sm" key={i}>
                  <span className="font-medium">{item.property}:</span>
                  <span className="text-muted-foreground">{item.from}</span>
                  <span>→</span>
                  <span className="font-medium">{item.to}</span>
                  <span className="text-muted-foreground">({item.count})</span>
                </div>
              ))}
            </div>
            {previewData.warnings.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                {previewData.warnings.map((warning, i) => (
                  <p
                    className="text-amber-800 text-sm dark:text-amber-200"
                    key={i}
                  >
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Affected cards
              </p>
              <ul className="space-y-1">
                {previewData.affectedCards.slice(0, 10).map((card) => (
                  <li className="text-sm" key={card.id}>
                    {card.title}
                  </li>
                ))}
                {previewData.affectedCards.length > 10 ? (
                  <li className="text-muted-foreground text-sm">
                    +{previewData.affectedCards.length - 10} more
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setPreviewData(null)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={applying} onClick={handleConfirmBulkEdit}>
              {applying ? "Applying…" : "Confirm Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Main render                                                        */
  /* ------------------------------------------------------------------ */

  return (
    <div className="relative flex h-[calc(100vh-12rem)] min-h-[480px] gap-0 overflow-hidden rounded-xl border border-border bg-background">
      {/* Bulk edit toolbar */}
      {renderBulkToolbar()}

      {/* Canvas */}
      <div
        className="flex-1 overflow-auto bg-muted/20"
        onMouseDown={handleCanvasMouseDown}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={canvasRef}
        role="application"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {localCards.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">Empty canvas</p>
              <p className="max-w-sm text-muted-foreground text-xs">
                Open the entity browser (Ctrl+E) to add events, clients, tasks,
                staff or deliveries to this board.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="relative"
            style={{ minHeight: "100%", minWidth: "100%" }}
          >
            {/* Groups layer (z-0) */}
            {localGroups.map(renderGroup)}

            {/* Connections layer (z-1) */}
            {renderConnections()}

            {/* Cards layer (z-2+) */}
            {localCards.map(renderCard)}
          </div>
        )}
      </div>

      {/* Entity browser panel */}
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
              <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
                  className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${
                    selectedBrowserCategoryId === category.id
                      ? "bg-accent font-medium"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedBrowserCategoryId((prev) =>
                      prev === category.id ? null : category.id
                    )
                  }
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

      {/* Create group dialog */}
      {renderGroupDialog()}

      {/* Bulk edit preview dialog */}
      {renderPreviewDialog()}

      {/* Delete group confirmation */}
      <AlertDialog
        onOpenChange={setDeleteGroupDialogOpen}
        open={deleteGroupDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the group and ungroup all cards inside it. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteGroup}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
