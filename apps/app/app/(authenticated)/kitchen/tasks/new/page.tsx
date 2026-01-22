"use client";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createKitchenTask } from "../actions";

const PRIORITIES = [
  { value: "1", label: "Urgent", description: "Highest priority, do first" },
  { value: "2", label: "High", description: "Important, do soon" },
  { value: "3", label: "Medium", description: "Normal priority" },
  { value: "5", label: "Low", description: "Can wait" },
  { value: "10", label: "Backlog", description: "When time permits" },
];

export default function NewKitchenTaskPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const task = await createKitchenTask(formData);
        router.push("/kitchen");
        router.refresh();
      } catch (error) {
        console.error("Failed to create task:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to create task. Please try again."
        );
      }
    });
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Button
        className="mb-6"
        variant="ghost"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Production Board
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create New Kitchen Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Chop onions for service"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary / Notes</Label>
              <Input
                id="summary"
                name="summary"
                placeholder="Additional details about this task"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select defaultValue="5" name="priority">
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div>
                          <div className="font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date / Time</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Creating..." : "Create Task"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
