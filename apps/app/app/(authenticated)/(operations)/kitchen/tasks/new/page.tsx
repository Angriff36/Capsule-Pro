"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { DateTimePicker } from "@repo/design-system/components/ui/date-time-picker";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { captureException } from "@sentry/nextjs";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createKitchenTask } from "../create-kitchen-task";

/** Manifest KitchenTask.create allows priority 1–5 only. */
const PRIORITIES = [
  { value: "1", label: "Urgent", description: "Highest priority, do first" },
  { value: "2", label: "High", description: "Important, do soon" },
  { value: "3", label: "Medium", description: "Normal priority" },
  { value: "4", label: "Below medium", description: "Lower urgency" },
  { value: "5", label: "Low", description: "Can wait" },
];

export default function NewKitchenTaskPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await createKitchenTask(formData);
        router.push("/kitchen");
        router.refresh();
      } catch (error) {
        captureException(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to create task. Please try again."
        );
      }
    });
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Button className="mb-6" onClick={() => router.back()} variant="ghost">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Production Board
      </Button>

      <Card tone="canvas">
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
              <Label htmlFor="summary">Summary *</Label>
              <Input
                id="summary"
                name="summary"
                placeholder="What needs to be done"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select defaultValue="5" name="priority" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div>
                          <div className="font-medium">{p.label}</div>
                          <div className="text-muted-foreground text-xs">
                            {p.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date / Time *</Label>
                <DateTimePicker id="dueDate" name="dueDate" required />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button disabled={isPending} type="submit">
                {isPending ? "Creating..." : "Create Task"}
              </Button>
              <Button
                onClick={() => router.back()}
                type="button"
                variant="outline"
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
