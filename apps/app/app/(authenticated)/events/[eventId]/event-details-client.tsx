"use client";

import type { Event } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import { Separator } from "@repo/design-system/components/ui/separator";
import { ChevronDownIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  generateTaskBreakdown,
  saveTaskBreakdown,
  type TaskBreakdown,
} from "../actions/task-breakdown";
import {
  GenerateTaskBreakdownModal,
  TaskBreakdownDisplay,
  TaskBreakdownSkeleton,
} from "../components/task-breakdown-display";
import type { PrepTaskSummary } from "./prep-task-contract";

type EventDetailsClientProps = {
  event: Event;
  prepTasks: PrepTaskSummary[];
};

export function EventDetailsClient({
  event,
  prepTasks: initialPrepTasks,
}: EventDetailsClientProps) {
  const router = useRouter();
  const [breakdown, setBreakdown] = useState<TaskBreakdown | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleGenerate = useCallback(
    async (customInstructions?: string) => {
      setIsGenerating(true);
      setGenerationProgress("Analyzing event details...");

      try {
        const progressMessages = [
          "Analyzing event details...",
          "Reviewing menu items...",
          "Creating prep tasks...",
          "Creating setup tasks...",
          "Creating cleanup tasks...",
          "Finalizing breakdown...",
        ];

        let messageIndex = 0;
        const progressInterval = setInterval(() => {
          if (messageIndex < progressMessages.length) {
            setGenerationProgress(progressMessages[messageIndex]);
            messageIndex++;
          }
        }, 1500);

        const result = await generateTaskBreakdown({
          eventId: event.id,
          customInstructions,
        });

        clearInterval(progressInterval);
        setGenerationProgress("");
        setBreakdown(result);
        setShowBreakdown(true);
        router.refresh();
      } catch (error) {
        console.error("Failed to generate task breakdown:", error);
        setGenerationProgress(
          "Failed to generate breakdown. Please try again."
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [event.id, router]
  );

  const handleSave = useCallback(async () => {
    if (!breakdown) {
      return;
    }

    try {
      await saveTaskBreakdown(event.id, breakdown);
      router.refresh();
    } catch (error) {
      console.error("Failed to save task breakdown:", error);
    }
  }, [breakdown, event.id, router]);

  const handleExport = useCallback(() => {
    if (!breakdown) {
      return;
    }

    const csvContent = generateCSV(breakdown);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${event.title.replace(/[^a-z0-9]/gi, "_")}_task_breakdown.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [breakdown, event.title]);

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-purple-500" />
            <h2 className="font-semibold text-lg">AI Task Assistant</h2>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <SparklesIcon className="mr-2 size-4" />
            Generate Task Breakdown
          </Button>
        </div>

        {showBreakdown && breakdown && (
          <TaskBreakdownDisplay
            breakdown={breakdown}
            generationProgress={generationProgress}
            isGenerating={isGenerating}
            onExport={handleExport}
            onRegenerate={() => setShowModal(true)}
            onSave={handleSave}
          />
        )}

        {!(showBreakdown || isGenerating) && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <SparklesIcon className="mx-auto mb-4 size-12 text-muted-foreground/50" />
            <h3 className="mb-2 font-medium">
              No task breakdown generated yet
            </h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Generate an AI-powered task breakdown with prep, setup, and
              cleanup tasks based on your event details and historical data.
            </p>
            <Button onClick={() => setShowModal(true)}>
              <SparklesIcon className="mr-2 size-4" />
              Generate Task Breakdown
            </Button>
          </div>
        )}

        {isGenerating && !breakdown && <TaskBreakdownSkeleton />}

        <Separator />

        <Collapsible className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="font-semibold text-sm">Source documents</div>
              <div className="text-muted-foreground text-sm">
                {/* imports.length files attached */}0 files attached
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">
                View files
                <ChevronDownIcon />
              </Button>
            </CollapsibleTrigger>
          </div>
          <Separator />
          <CollapsibleContent className="px-6 py-4">
            <form
              action={async (formData) => {
                formData.append("eventId", event.id);
                // attachEventImport action
              }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <input
                  accept=".csv,.pdf,image/*"
                  className="text-sm"
                  name="file"
                  type="file"
                />
                <Button type="submit" variant="secondary">
                  Attach file
                </Button>
              </div>
            </form>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          className="rounded-xl border bg-card text-card-foreground shadow-sm"
          defaultOpen={!showBreakdown}
        >
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="font-semibold text-sm">Prep tasks</div>
              <div className="text-muted-foreground text-sm">
                {initialPrepTasks.length} tasks linked to this event
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">
                View tasks
                <ChevronDownIcon />
              </Button>
            </CollapsibleTrigger>
          </div>
          <Separator />
          <CollapsibleContent className="px-6 py-4">
            {initialPrepTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <PlusIcon className="size-6 text-muted-foreground" />
                </div>
                <p className="mb-2 text-muted-foreground text-sm">
                  No prep tasks yet
                </p>
                <p className="mb-4 text-muted-foreground text-xs">
                  Generate a task breakdown or add tasks manually
                </p>
                <Button
                  onClick={() => setShowModal(true)}
                  size="sm"
                  variant="outline"
                >
                  <SparklesIcon className="mr-2 size-3" />
                  Generate with AI
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {initialPrepTasks.map((task) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3"
                    key={task.id}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{task.name}</span>
                      <span className="text-muted-foreground text-xs">
                        Due{" "}
                        {new Date(task.dueByDate).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.isEventFinish ? (
                        <span className="rounded bg-muted px-2 py-1 text-xs">
                          Finish
                        </span>
                      ) : null}
                      <span className="rounded bg-muted px-2 py-1 text-xs capitalize">
                        {task.status}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {task.servingsTotal ??
                          Math.round(Number(task.quantityTotal))}
                        {task.servingsTotal ? " servings" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <GenerateTaskBreakdownModal
        eventDate={event.eventDate.toISOString()}
        eventId={event.id}
        eventTitle={event.title}
        guestCount={event.guestCount}
        isOpen={showModal}
        onGenerate={handleGenerate}
        onOpenChange={setShowModal}
        venueName={event.venueName ?? undefined}
      />
    </>
  );
}

function generateCSV(breakdown: TaskBreakdown): string {
  const rows: string[] = [];
  rows.push(
    `"Task Name","Description","Section","Duration (min)","Relative Time","Critical","Confidence"`
  );

  const allTasks = [
    ...breakdown.prep.map((t) => ({ ...t, section: "Prep" })),
    ...breakdown.setup.map((t) => ({ ...t, section: "Setup" })),
    ...breakdown.cleanup.map((t) => ({ ...t, section: "Cleanup" })),
  ];

  for (const task of allTasks) {
    const row = [
      `"${task.name.replace(/"/g, '""')}"`,
      `"${(task.description || "").replace(/"/g, '""')}"`,
      task.section,
      task.durationMinutes.toString(),
      task.relativeTime || "",
      task.isCritical ? "Yes" : "No",
      task.confidence ? Math.round(task.confidence * 100).toString() : "",
    ];
    rows.push(row.join(","));
  }

  rows.push("");
  rows.push(`"Total Prep Time","${breakdown.totalPrepTime} min"`);
  rows.push(`"Total Setup Time","${breakdown.totalSetupTime} min"`);
  rows.push(`"Total Cleanup Time","${breakdown.totalCleanupTime} min"`);
  rows.push(
    `"Grand Total","${breakdown.totalPrepTime + breakdown.totalSetupTime + breakdown.totalCleanupTime} min"`
  );
  rows.push("");
  rows.push(`"Generated At","${breakdown.generatedAt.toISOString()}"`);
  rows.push(`"Event Date","${breakdown.eventDate.toISOString()}"`);
  rows.push(`"Guest Count","${breakdown.guestCount}"`);

  return rows.join("\n");
}
