"use client";

/**
 * @module BattleboardsClient
 * @intent Full CRUD interface for managing command boards (battleboards)
 * @responsibility Client component that lists, creates, edits, deletes, and
 *   shows detail views for command boards. Includes search, summary stats,
 *   and card detail table.
 * @domain Tools / Command Board
 * @tags battleboards, command-board, client-component, crud
 * @canonical true
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Copy,
  Edit,
  LayoutGrid,
  LayoutList,
  Loader2,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommandBoardCard {
  id: string;
  tenant_id: string;
  board_id: string;
  title: string;
  content: string | null;
  card_type: string;
  status: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
  color: string | null;
  metadata: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

interface CommandBoardListItem {
  id: string;
  tenant_id: string;
  event_id: string | null;
  name: string;
  description: string | null;
  status: string;
  is_template: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  cards_count: number;
}

interface CommandBoardDetail {
  id: string;
  tenant_id: string;
  event_id: string | null;
  name: string;
  description: string | null;
  status: string;
  is_template: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  cards: CommandBoardCard[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | null | undefined): string {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

const CARD_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  completed: "secondary",
  archived: "outline",
  pending: "outline",
  in_progress: "default",
  blocked: "destructive",
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/50" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground/75">{description}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit Dialog
// ---------------------------------------------------------------------------

interface BoardFormData {
  name: string;
  description: string;
  eventId: string;
  isTemplate: boolean;
}

function BoardFormDialog({
  mode,
  open,
  onOpenChange,
  initialData,
  onSubmit,
  submitting,
}: {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: BoardFormData;
  onSubmit: (data: BoardFormData) => Promise<void>;
  submitting: boolean;
}) {
  const [form, setForm] = useState<BoardFormData>(
    initialData ?? { name: "", description: "", eventId: "", isTemplate: false }
  );

  useEffect(() => {
    if (open) {
      setForm(
        initialData ?? {
          name: "",
          description: "",
          eventId: "",
          isTemplate: false,
        }
      );
    }
  }, [open, initialData]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Board name is required.");
      return;
    }
    await onSubmit(form);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? (
              <Plus className="h-5 w-5" />
            ) : (
              <Pencil className="h-5 w-5" />
            )}
            {mode === "create" ? "Create Board" : "Edit Board"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new battleboard for production and service coordination."
              : "Update the battleboard details."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="board-name">Name *</Label>
            <Input
              id="board-name"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Board name"
              value={form.name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="board-description">Description</Label>
            <Textarea
              id="board-description"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Optional board description"
              rows={3}
              value={form.description}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="board-event-id">Event ID (optional)</Label>
            <Input
              id="board-event-id"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, eventId: e.target.value }))
              }
              placeholder="Link to an event"
              value={form.eventId}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              checked={form.isTemplate}
              className="h-4 w-4 rounded border-gray-300"
              id="board-template"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isTemplate: e.target.checked }))
              }
              type="checkbox"
            />
            <Label htmlFor="board-template">Save as template</Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={submitting} variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "create" ? "Creating..." : "Saving..."}
              </>
            ) : mode === "create" ? (
              "Create Board"
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

function DeleteBoardDialog({
  board,
  open,
  onOpenChange,
  onConfirm,
  deleting,
}: {
  board: CommandBoardListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Delete Board
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this board? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {board && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <span className="font-medium">{board.name}</span>
            {board.description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {board.description}
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={deleting} variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button disabled={deleting} onClick={onConfirm} variant="destructive">
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Board
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Board List Card
// ---------------------------------------------------------------------------

function BoardCard({
  board,
  onView,
  onEdit,
  onDelete,
}: {
  board: CommandBoardListItem;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{board.name}</CardTitle>
            {board.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {board.description}
              </CardDescription>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[board.status] ?? "outline"}>
            {STATUS_LABEL[board.status] ?? board.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <StickyNote className="h-3 w-3" />
            {board.cards_count} {board.cards_count === 1 ? "card" : "cards"}
          </span>
          {board.is_template && (
            <Badge className="text-xs" variant="outline">
              <Copy className="mr-1 h-3 w-3" />
              Template
            </Badge>
          )}
          {board.event_id && (
            <Badge className="text-xs" variant="outline">
              <Calendar className="mr-1 h-3 w-3" />
              Event
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Updated {formatDate(board.updated_at)}</span>
        </div>
        <Separator />
        <div className="flex items-center gap-1">
          <Button onClick={onView} size="sm" variant="outline">
            View
          </Button>
          <Button onClick={onEdit} size="sm" variant="ghost">
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
          <Button
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Board Detail View
// ---------------------------------------------------------------------------

function BoardDetailView({
  board,
  onBack,
  onEdit,
  onDelete,
}: {
  board: CommandBoardDetail;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={onBack} size="sm" variant="outline">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{board.name}</h2>
            {board.description && (
              <p className="text-sm text-muted-foreground">
                {board.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[board.status] ?? "outline"}>
            {STATUS_LABEL[board.status] ?? board.status}
          </Badge>
          {board.is_template && (
            <Badge variant="outline">
              <Copy className="mr-1 h-3 w-3" />
              Template
            </Badge>
          )}
          <Button onClick={onEdit} size="sm" variant="outline">
            <Pencil className="mr-1 h-4 w-4" />
            Edit
          </Button>
          <Button
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Created {formatDateTime(board.created_at)}</span>
        <span>Updated {formatDateTime(board.updated_at)}</span>
        {board.event_id && <span>Event: {board.event_id}</span>}
      </div>

      <Separator />

      {/* Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5" />
            Cards
          </CardTitle>
          <CardDescription>
            {board.cards.length} {board.cards.length === 1 ? "card" : "cards"}{" "}
            on this board.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {board.cards.length === 0 ? (
            <EmptyState
              description="Cards added to this board will appear here."
              icon={StickyNote}
              title="No cards yet"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {board.cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{card.title}</span>
                        {card.content && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                            {card.content}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-xs" variant="outline">
                        {card.card_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          CARD_STATUS_VARIANT[card.status] ?? "outline"
                        }
                      >
                        {card.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      ({card.position_x}, {card.position_y})
                      <span className="ml-1">
                        {card.width}x{card.height}
                      </span>
                    </TableCell>
                    <TableCell>
                      {card.color ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-3 w-3 rounded-sm border"
                            style={{ backgroundColor: card.color }}
                          />
                          <span className="text-xs">{card.color}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(card.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      {board.tags.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {board.tags.map((tag) => (
              <Badge className="text-xs" key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function BattleboardsClient() {
  // -- View state --
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  // -- Data state --
  const [boards, setBoards] = useState<CommandBoardListItem[]>([]);
  const [boardDetail, setBoardDetail] = useState<CommandBoardDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // -- Search --
  const [search, setSearch] = useState("");

  // -- Dialog state --
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CommandBoardListItem | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<CommandBoardListItem | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // -- Data loading --
  const loadBoards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }
      params.set("limit", "100");
      const qs = params.toString();
      const url = `/api/command-board${qs ? `?${qs}` : ""}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch boards");
      const data = await res.json();
      setBoards(data.data ?? []);
    } catch {
      toast.error("Failed to load battleboards.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const loadBoardDetail = useCallback(async (boardId: string) => {
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/command-board/${boardId}`);
      if (!res.ok) throw new Error("Failed to fetch board details");
      const data = await res.json();
      setBoardDetail(data);
    } catch {
      toast.error("Failed to load board details.");
      setBoardDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // -- Handlers --
  const handleView = (board: CommandBoardListItem) => {
    setSelectedBoardId(board.id);
    loadBoardDetail(board.id);
    setView("detail");
  };

  const handleBack = () => {
    setView("list");
    setSelectedBoardId(null);
    setBoardDetail(null);
  };

  const handleEdit = (board: CommandBoardListItem | CommandBoardDetail) => {
    setEditTarget({
      id: board.id,
      name: board.name,
      description: board.description,
      status: board.status,
      is_template: board.is_template,
      tags: board.tags,
      created_at: board.created_at,
      updated_at: board.updated_at,
      tenant_id: board.tenant_id,
      event_id: board.event_id,
      cards_count:
        "cards_count" in board
          ? board.cards_count
          : "cards" in board
            ? board.cards.length
            : 0,
    });
    setEditOpen(true);
  };

  const handleDeleteRequest = (
    board: CommandBoardListItem | CommandBoardDetail
  ) => {
    setDeleteTarget({
      id: board.id,
      name: board.name,
      description: board.description,
      status: board.status,
      is_template: board.is_template,
      tags: board.tags,
      created_at: board.created_at,
      updated_at: board.updated_at,
      tenant_id: board.tenant_id,
      event_id: board.event_id,
      cards_count:
        "cards_count" in board
          ? board.cards_count
          : "cards" in board
            ? board.cards.length
            : 0,
    });
    setDeleteOpen(true);
  };

  const handleCreateSubmit = async (formData: BoardFormData) => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: formData.name.trim(),
      };
      if (formData.description.trim()) {
        body.description = formData.description.trim();
      }
      if (formData.eventId.trim()) {
        body.eventId = formData.eventId.trim();
      }
      if (formData.isTemplate) {
        body.isTemplate = true;
      }
      const res = await apiFetch("/api/command-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? "Failed to create board");
      }
      toast.success(`Board "${formData.name.trim()}" created.`);
      setCreateOpen(false);
      await loadBoards();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create board."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (formData: BoardFormData) => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: formData.name.trim(),
      };
      if (formData.description.trim()) {
        body.description = formData.description.trim();
      }
      if (formData.isTemplate) {
        body.isTemplate = formData.isTemplate;
      }
      if (formData.eventId.trim()) {
        body.eventId = formData.eventId.trim();
      }
      const res = await apiFetch(`/api/command-board/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? "Failed to update board");
      }
      toast.success(`Board "${formData.name.trim()}" updated.`);
      setEditOpen(false);
      setEditTarget(null);
      await loadBoards();
      if (selectedBoardId) {
        await loadBoardDetail(selectedBoardId);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update board."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/command-board/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? "Failed to delete board");
      }
      toast.success(`Board "${deleteTarget.name}" deleted.`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      if (view === "detail" && selectedBoardId === deleteTarget.id) {
        handleBack();
      }
      await loadBoards();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete board."
      );
    } finally {
      setDeleting(false);
    }
  };

  // -- Computed stats --
  const totalBoards = boards.length;
  const activeBoards = boards.filter((b) => b.status === "active").length;
  const templateBoards = boards.filter((b) => b.is_template).length;
  const totalCards = boards.reduce((sum, b) => sum + b.cards_count, 0);

  // -- Render --
  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={LayoutGrid} label="Total Boards" value={totalBoards} />
            <StatCard icon={LayoutList} label="Active" value={activeBoards} />
            <StatCard
              icon={Copy}
              label="Templates"
              value={templateBoards}
            />
            <StatCard
              icon={StickyNote}
              label="Total Cards"
              value={totalCards}
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search boards..."
                value={search}
              />
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Board
            </Button>
          </div>

          {/* Board Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : boards.length === 0 ? (
            <EmptyState
              description="Create your first battleboard to coordinate production and service."
              icon={LayoutGrid}
              title="No boards found"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  onDelete={() => handleDeleteRequest(board)}
                  onEdit={() => handleEdit(board)}
                  onView={() => handleView(board)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Detail View */}
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : boardDetail ? (
            <BoardDetailView
              board={boardDetail}
              onBack={handleBack}
              onDelete={() => handleDeleteRequest(boardDetail)}
              onEdit={() => handleEdit(boardDetail)}
            />
          ) : (
            <EmptyState
              description="The requested board could not be loaded."
              icon={AlertCircle}
              title="Board not found"
            />
          )}
        </>
      )}

      {/* Dialogs */}
      <BoardFormDialog
        mode="create"
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        open={createOpen}
        submitting={submitting}
      />

      <BoardFormDialog
        initialData={
          editTarget
            ? {
                name: editTarget.name,
                description: editTarget.description ?? "",
                eventId: editTarget.event_id ?? "",
                isTemplate: editTarget.is_template,
              }
            : undefined
        }
        mode="edit"
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditTarget(null);
        }}
        onSubmit={handleEditSubmit}
        open={editOpen}
        submitting={submitting}
      />

      <DeleteBoardDialog
        board={deleteTarget}
        deleting={deleting}
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteTarget(null);
        }}
        open={deleteOpen}
      />
    </div>
  );
}
