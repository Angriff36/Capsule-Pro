/**
 * @module NewBattleBoardPage
 * @intent Form page for creating a new battle board
 * @responsibility Render a creation form, POST to the manifest create command, and redirect to the new board on success
 * @domain Events
 * @tags battle-boards, create, form
 * @canonical true
 */

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { battleBoardCreate } from "@/app/lib/manifest-client.generated";
import { Header } from "../../../../components/header";
import { OperationalPageShell } from "../../../../components/operational-page-shell";

const BOARD_TYPES = [
  { value: "dish_ranking", label: "Dish Ranking" },
  { value: "menu_review", label: "Menu Review" },
  { value: "tasting", label: "Tasting" },
  { value: "custom", label: "Custom" },
] as const;

export default function NewBattleBoardPage() {
  const router = useRouter();
  // Prefill when arriving from an event (e.g. the event board's "create ↗").
  const searchParams = useSearchParams();
  const [boardName, setBoardName] = useState("");
  const [boardType, setBoardType] = useState("dish_ranking");
  const [eventId, setEventId] = useState(searchParams?.get("eventId") ?? "");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!boardName.trim()) {
      toast.error("Board name is required");
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        boardName: boardName.trim(),
        boardType,
        description: description.trim() || null,
        isTemplate,
      };

      if (eventId.trim()) {
        payload.eventId = eventId.trim();
      }

      const result = await battleBoardCreate(payload);

      const newId = result?.id;

      toast.success("Battle board created successfully");

      if (newId) {
        router.push(`/events/battle-boards/${newId}`);
      } else {
        router.push("/events/battle-boards");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create battle board"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Header
        page="New Battle Board"
        pages={[
          { label: "Events", href: "/events" },
          { label: "Battle Boards", href: "/events/battle-boards" },
        ]}
      />
      <OperationalPageShell
        actions={
          <Link href="/events/battle-boards">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to battle boards
            </Button>
          </Link>
        }
        description="Set up a new battle board for event staff assignments and operational timelines."
        eyebrow="Events / Battle boards"
        title="New battle board"
      >
        <div className="mx-auto w-full max-w-2xl">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Create New Battle Board</CardTitle>
              <CardDescription>
                Set up a new battle board for event staff assignments and
                operational timelines.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Board Name */}
                <div className="space-y-2">
                  <Label htmlFor="boardName">
                    Board Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    disabled={creating}
                    id="boardName"
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="e.g., Annual Gala Battle Board"
                    required
                    value={boardName}
                  />
                </div>

                {/* Board Type */}
                <div className="space-y-2">
                  <Label htmlFor="boardType">Board Type</Label>
                  <Select
                    disabled={creating}
                    onValueChange={setBoardType}
                    value={boardType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select board type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOARD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Event ID */}
                <div className="space-y-2">
                  <Label htmlFor="eventId">Event ID (optional)</Label>
                  <Input
                    disabled={creating}
                    id="eventId"
                    onChange={(e) => setEventId(e.target.value)}
                    placeholder="Paste an event UUID to link this board"
                    value={eventId}
                  />
                  <p className="text-muted-foreground text-xs">
                    Link this board to an existing event for automatic data
                    population.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    disabled={creating}
                    id="description"
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the purpose and scope of this battle board..."
                    rows={3}
                    value={description}
                  />
                </div>

                {/* Template checkbox */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isTemplate}
                    disabled={creating}
                    id="isTemplate"
                    onCheckedChange={(checked) =>
                      setIsTemplate(checked === true)
                    }
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="isTemplate">Save as template</Label>
                    <p className="text-muted-foreground text-xs">
                      Templates can be reused across multiple events.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button disabled={creating} type="submit">
                    {creating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {creating ? "Creating..." : "Create Board"}
                  </Button>
                  <Button
                    asChild
                    disabled={creating}
                    type="button"
                    variant="outline"
                  >
                    <Link href="/events/battle-boards">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </OperationalPageShell>
    </>
  );
}
