"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DownloadIcon,
  InfoIcon,
  RefreshCwIcon,
  SparklesIcon,
  StopCircleIcon,
  UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate, parseISODateToLocal } from "../../../lib/format";
import type {
  TaskBreakdown,
  TaskBreakdownItem,
  TaskSection,
} from "../actions/task-breakdown";

const SECTION_CONFIG: Record<
  TaskSection,
  {
    label: string;
    color: "blue" | "green" | "orange";
    icon: string;
    description: string;
  }
> = {
  prep: {
    label: "Prep Tasks",
    color: "blue",
    icon: "🔪",
    description: "Preparation tasks before the event",
  },
  setup: {
    label: "Setup Tasks",
    color: "green",
    icon: "⚙️",
    description: "Setup and configuration before service",
  },
  cleanup: {
    label: "Cleanup Tasks",
    color: "orange",
    icon: "🧹",
    description: "Cleanup and breakdown after service",
  },
};

const COLOR_VARIANTS = {
  blue: "border border-hairline bg-muted/20 text-foreground",
  green: "border border-hairline bg-muted/20 text-foreground",
  orange: "border border-hairline bg-muted/20 text-foreground",
} as const;

interface TaskCardProps {
  onAssign?: (taskId: string) => void;
  onComplete?: (taskId: string, completed: boolean) => void;
  section: TaskSection;
  task: TaskBreakdownItem;
}

function TaskCard({ task, onComplete, onAssign }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleComplete = (checked: boolean) => {
    setIsCompleted(checked);
    onComplete?.(task.id, checked);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTimeBadge = () => {
    if (task.isCritical && task.dueInHours) {
      return (
        <Badge
          className="flex items-center gap-1 border-orange-500 text-orange-600"
          variant="outline"
        >
          <AlertTriangleIcon className="size-3" />
          Due in {task.dueInHours}h
        </Badge>
      );
    }
    if (task.relativeTime) {
      return (
        <Badge className="flex items-center gap-1" variant="outline">
          <ClockIcon className="size-3" />
          {task.relativeTime}
        </Badge>
      );
    }
    return null;
  };

  const hasDetails = task.ingredients || task.steps || task.historicalContext;

  return (
    <Card
      className={`transition-all duration-200 ${
        isCompleted ? "opacity-50" : ""
      } hover:border-primary/40`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="pt-1">
            <Checkbox
              checked={isCompleted}
              className="h-5 w-5"
              id={`task-${task.id}`}
              onCheckedChange={handleComplete}
            />
          </div>
          <div className="min-w-0 flex-1">
            {/* Primary content: title, description, time badges */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <label
                  className="cursor-pointer font-medium text-base"
                  htmlFor={`task-${task.id}`}
                >
                  {task.name}
                </label>
                {task.description && (
                  <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {getTimeBadge()}
                <Badge variant="secondary">
                  {formatDuration(task.durationMinutes)}
                </Badge>
              </div>
            </div>

            {/* Secondary metadata: confidence - subtle */}
            {task.confidence && (
              <div className="mt-2 flex items-center gap-1 text-muted-foreground text-xs">
                <InfoIcon className="size-3" />
                <span>{Math.round(task.confidence * 100)}% confidence</span>
              </div>
            )}

            {/* Expandable details section */}
            {hasDetails && (
              <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    className="mt-3 h-8 text-xs"
                    size="sm"
                    variant="ghost"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUpIcon className="mr-1 size-3" />
                        Less details
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className="mr-1 size-3" />
                        More details
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3">
                  {task.ingredients && task.ingredients.length > 0 && (
                    <div>
                      <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Ingredients
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        {task.ingredients.map((ing, i) => (
                          <li className="text-muted-foreground" key={i}>
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {task.steps && task.steps.length > 0 && (
                    <div>
                      <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Steps
                      </p>
                      <ol className="list-inside list-decimal space-y-1 text-sm">
                        {task.steps.map((step, i) => (
                          <li className="text-muted-foreground" key={i}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {task.historicalContext && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-start gap-2">
                        <SparklesIcon className="mt-0.5 size-4 flex-shrink-0 text-purple-500" />
                        <div>
                          <p className="mb-1 font-medium text-xs">
                            Historical Context
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {task.historicalContext}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Action footer with separator — only when there is something real to show */}
            {(onAssign || task.assignment) && (
              <>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  {onAssign ? (
                    <Button
                      className="h-8 text-xs"
                      onClick={() => onAssign(task.id)}
                      size="sm"
                      variant="outline"
                    >
                      <UserIcon className="mr-1 size-3" />
                      {task.assignment ? task.assignment : "Assign"}
                    </Button>
                  ) : (
                    <span />
                  )}
                  {task.assignment && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <UserIcon className="size-3" />
                      </div>
                      <span className="text-xs">{task.assignment}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskSectionProps {
  onAssign?: (taskId: string) => void;
  onComplete?: (taskId: string, completed: boolean) => void;
  section: TaskSection;
  tasks: TaskBreakdownItem[];
}

function TaskSectionComponent({
  section,
  tasks,
  onComplete,
  onAssign,
}: TaskSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const config = SECTION_CONFIG[section];

  const totalTime = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);

  const formatTotalTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <div className={`rounded-xl border ${COLOR_VARIANTS[config.color]}`}>
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">{config.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{config.label}</h3>
                  <Badge className="text-xs" variant="secondary">
                    {tasks.length} tasks
                  </Badge>
                </div>
                <p className="text-xs opacity-75">{config.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-sm">
                {formatTotalTime(totalTime)}
              </span>
              {isOpen ? (
                <ChevronUpIcon className="size-4" />
              ) : (
                <ChevronDownIcon className="size-4" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <div className="space-y-3 p-4">
            {tasks.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">
                No {config.label.toLowerCase()} needed
              </p>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  onAssign={onAssign}
                  onComplete={onComplete}
                  section={section}
                  task={task}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface TaskBreakdownDisplayProps {
  breakdown: TaskBreakdown;
  generationProgress?: string;
  isGenerating?: boolean;
  onCancelGeneration?: () => void;
  onExport?: () => void;
  onRegenerate?: () => void;
  onSave?: () => void;
}

export function TaskBreakdownDisplay({
  breakdown,
  onRegenerate,
  onExport,
  onSave,
  isGenerating,
  generationProgress,
  onCancelGeneration,
}: TaskBreakdownDisplayProps) {
  const [_streamingTasks, setStreamingTasks] = useState<
    { section: TaskSection; taskIndex: number }[]
  >([]);
  const [displayedTasks, setDisplayedTasks] = useState<
    Record<TaskSection, TaskBreakdownItem[]>
  >({
    prep: [],
    setup: [],
    cleanup: [],
  });

  useEffect(() => {
    if (!isGenerating) {
      setDisplayedTasks({
        prep: breakdown.prep,
        setup: breakdown.setup,
        cleanup: breakdown.cleanup,
      });
      setStreamingTasks([]);
      return;
    }

    const allTasks: { section: TaskSection; task: TaskBreakdownItem }[] = [
      ...breakdown.prep.map((t) => ({
        section: "prep" as TaskSection,
        task: t,
      })),
      ...breakdown.setup.map((t) => ({
        section: "setup" as TaskSection,
        task: t,
      })),
      ...breakdown.cleanup.map((t) => ({
        section: "cleanup" as TaskSection,
        task: t,
      })),
    ];

    let currentIndex = 0;
    const maxVisible = Math.min(3, allTasks.length);

    setDisplayedTasks({
      prep: allTasks
        .slice(0, maxVisible)
        .filter((t) => t.section === "prep")
        .map((t) => t.task),
      setup: [],
      cleanup: [],
    });

    const interval = setInterval(() => {
      if (currentIndex >= allTasks.length) {
        clearInterval(interval);
        setDisplayedTasks({
          prep: breakdown.prep,
          setup: breakdown.setup,
          cleanup: breakdown.cleanup,
        });
        setStreamingTasks([]);
        return;
      }

      const newTask = allTasks[currentIndex];
      if (!newTask) {
        currentIndex++;
        return;
      }
      setDisplayedTasks((prev) => ({
        ...prev,
        [newTask.section]: [...prev[newTask.section], newTask.task],
      }));
      currentIndex++;
    }, 300);

    return () => clearInterval(interval);
  }, [isGenerating, breakdown]);

  const totalPrepTime = breakdown.totalPrepTime;
  const totalSetupTime = breakdown.totalSetupTime;
  const totalCleanupTime = breakdown.totalCleanupTime;
  const grandTotal = totalPrepTime + totalSetupTime + totalCleanupTime;

  const formatGrandTotal = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `${mins} min`;
    }
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };

  const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const isIntimate = breakdown.guestCount < 10;

  return (
    <div aria-label="Task Breakdown" className="space-y-6" role="region">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-5 text-purple-500" />
          <h2 className="font-semibold text-xl">AI-Generated Task Breakdown</h2>
          <Badge className="text-xs" variant="outline">
            Generated {eventDateFormatter.format(breakdown.generatedAt)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <Button
              disabled={isGenerating}
              onClick={onRegenerate}
              size="sm"
              variant="outline"
            >
              <RefreshCwIcon className="mr-1 size-3" />
              Regenerate
            </Button>
          )}
          {onExport && (
            <Button onClick={onExport} size="sm" variant="outline">
              <DownloadIcon className="mr-1 size-3" />
              Export
            </Button>
          )}
          {onSave && (
            <Button disabled={isGenerating} onClick={onSave} size="sm">
              Save Breakdown
            </Button>
          )}
        </div>
      </div>

      {isIntimate && (
        <Badge className="mb-2" variant="secondary">
          Scaled for intimate gathering ({breakdown.guestCount} guests)
        </Badge>
      )}

      {breakdown.historicalEventCount !== undefined && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <InfoIcon className="size-4" />
          <span>Based on {breakdown.historicalEventCount} similar events</span>
        </div>
      )}

      {breakdown.disclaimer && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <InfoIcon className="size-4" />
          <span>{breakdown.disclaimer}</span>
        </div>
      )}

      {isGenerating && (
        <Card className="border border-hairline bg-muted/20" tone="canvas">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Spinner className="size-5 text-purple-500" />
              <div className="flex-1">
                <p className="font-medium">Generating task breakdown...</p>
                {generationProgress && (
                  <p className="text-muted-foreground text-sm">
                    {generationProgress}
                  </p>
                )}
              </div>
              <Button
                disabled={!onCancelGeneration}
                onClick={onCancelGeneration}
                size="sm"
                title={
                  onCancelGeneration
                    ? undefined
                    : "Stop is not available in this context"
                }
                variant="outline"
              >
                <StopCircleIcon className="mr-1 size-4" />
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <TaskSectionComponent section="prep" tasks={displayedTasks.prep} />
        <TaskSectionComponent section="setup" tasks={displayedTasks.setup} />
        <TaskSectionComponent
          section="cleanup"
          tasks={displayedTasks.cleanup}
        />
      </div>

      <Card tone="canvas">
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-sm">
            Total Time Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-semibold text-2xl text-blue-600">
                {formatGrandTotal(totalPrepTime)}
              </p>
              <p className="text-muted-foreground text-xs">Prep</p>
            </div>
            <div>
              <p className="font-semibold text-2xl text-green-600">
                {formatGrandTotal(totalSetupTime)}
              </p>
              <p className="text-muted-foreground text-xs">Setup</p>
            </div>
            <div>
              <p className="font-semibold text-2xl text-orange-600">
                {formatGrandTotal(totalCleanupTime)}
              </p>
              <p className="text-muted-foreground text-xs">Cleanup</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-center">
            <p className="font-semibold text-2xl">
              {formatGrandTotal(grandTotal)}
            </p>
            <p className="text-muted-foreground text-xs">Grand Total</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface TaskBreakdownSkeletonProps {
  sections?: number;
}

export function TaskBreakdownSkeleton({
  sections = 3,
}: TaskBreakdownSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: sections }).map((_, i) => (
          <Card key={i} tone="canvas">
            <CardHeader className="pb-2">
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton className="h-24 w-full" key={j} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Skeleton className="h-32 w-full" />
    </div>
  );
}

interface GenerateTaskBreakdownModalProps {
  eventDate: string;
  eventId: string;
  eventTitle: string;
  guestCount: number;
  isOpen?: boolean;
  onGenerate: (customInstructions?: string) => Promise<void>;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  venueName?: string;
}

export function GenerateTaskBreakdownModal({
  eventId: _eventId,
  eventTitle,
  eventDate,
  guestCount,
  venueName,
  onGenerate,
  isOpen = false,
  onOpenChange,
  showTrigger = true,
}: GenerateTaskBreakdownModalProps) {
  const [customInstructions, setCustomInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress("Analyzing event details...");

    try {
      await onGenerate(customInstructions || undefined);
      onOpenChange?.(false);
    } catch (error) {
      // Show error in progress area instead of silently failing
      const message =
        error instanceof Error ? error.message : "Failed to generate tasks";
      setGenerationProgress(`Error: ${message}`);
      // Don't close modal on error - let user see what happened
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button>
            <SparklesIcon className="mr-2 size-4" />
            Generate Task Breakdown
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-purple-500" />
            Generate Task Breakdown
          </DialogTitle>
          <DialogDescription>
            AI will analyze your event details and create a comprehensive task
            breakdown based on historical data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 rounded-lg bg-muted p-4">
            <h4 className="font-medium text-sm">Event Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Event:</span>
                <p className="font-medium">{eventTitle}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <p className="font-medium">
                  {formatDate(parseISODateToLocal(eventDate))}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Guests:</span>
                <p className="font-medium">{guestCount}</p>
              </div>
              {venueName && (
                <div>
                  <span className="text-muted-foreground">Venue:</span>
                  <p className="font-medium">{venueName}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="font-medium text-sm">
              Custom Instructions (optional)
            </label>
            <textarea
              className="mt-2 min-h-[100px] w-full resize-none rounded-md border bg-background p-3 text-sm"
              disabled={isGenerating}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Add any specific requirements or preferences..."
              value={customInstructions}
            />
          </div>

          <div className="flex items-start gap-2 text-muted-foreground text-xs">
            <InfoIcon className="mt-0.5 size-4 flex-shrink-0" />
            <p>
              This will use event details and similar historical events to
              generate prep, setup, and cleanup tasks with time estimates.
            </p>
          </div>

          {isGenerating && (
            <div className="flex items-center gap-2 text-sm">
              <Spinner className="size-4" />
              <span>{generationProgress}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            disabled={isGenerating}
            onClick={() => onOpenChange?.(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating ? (
              <>
                <Spinner className="mr-2 size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="mr-2 size-4" />
                Generate Breakdown
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
