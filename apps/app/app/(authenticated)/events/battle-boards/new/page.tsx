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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { Header } from "../../../components/header";

const BOARD_TYPES = [
  { value: "dish_ranking", label: "Dish Ranking" },
  { value: "menu_review", label: "Menu Review" },
  { value: "tasting", label: "Tasting" },
  { value: "custom", label: "Custom" },
] as const;

interface CreateResult {
  id?: string;
  instanceId?: string;
  [key: string]: unknown;
}

export default function NewBattleBoardPage() {
  const router = useRouter();
  const [boardName, setBoardName] = useState("");
  const [boardType, setBoardType] = useState("dish_ranking");
  const [eventId, setEventId] = useState("");
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
        board_name: boardName.trim(),
        board_type: boardType,
        description: description.trim() || null,
        is_template: isTemplate,
      };

      if (eventId.trim()) {
        payload.eventId = eventId.trim();
      }

      const response = await apiFetch(
        "/api/events/battle-boards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || data.error || "Failed to create battle board"
        );
      }

      const result = data.result as CreateResult | undefined;
      const newId = result?.id || result?.instanceId;

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
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Navigation */}
        <Link href="/events/battle-boards">
          <Button size="sm" variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Battle Boards
          </Button>
        </Link>

        {/* Form Card */}
        <div className="mx-auto w-full max-w-2xl">
          <Card>
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
                  <p className="text-xs text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground">
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
                  <Button asChild disabled={creating} type="button" variant="outline">
                    <Link href="/events/battle-boards">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
