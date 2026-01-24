"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskBreakdownDisplay = TaskBreakdownDisplay;
exports.TaskBreakdownSkeleton = TaskBreakdownSkeleton;
exports.GenerateTaskBreakdownModal = GenerateTaskBreakdownModal;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const checkbox_1 = require("@repo/design-system/components/ui/checkbox");
const collapsible_1 = require("@repo/design-system/components/ui/collapsible");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const separator_1 = require("@repo/design-system/components/ui/separator");
const skeleton_1 = require("@repo/design-system/components/ui/skeleton");
const spinner_1 = require("@repo/design-system/components/ui/spinner");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const SECTION_CONFIG = {
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
  blue: "bg-blue-50 border-blue-200 text-blue-900",
  green: "bg-green-50 border-green-200 text-green-900",
  orange: "bg-orange-50 border-orange-200 text-orange-900",
};
const SECTION_COLORS = {
  prep: "bg-blue-500",
  setup: "bg-green-500",
  cleanup: "bg-orange-500",
};
function TaskCard({ task, section, onComplete, onAssign }) {
  const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
  const [isCompleted, setIsCompleted] = (0, react_1.useState)(false);
  const handleComplete = (checked) => {
    setIsCompleted(checked);
    onComplete?.(task.id, checked);
  };
  const formatDuration = (minutes) => {
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
        <badge_1.Badge
          className="flex items-center gap-1 border-orange-500 text-orange-600"
          variant="outline"
        >
          <lucide_react_1.AlertTriangleIcon className="size-3" />
          Due in {task.dueInHours}h
        </badge_1.Badge>
      );
    }
    if (task.relativeTime) {
      return (
        <badge_1.Badge className="flex items-center gap-1" variant="outline">
          <lucide_react_1.ClockIcon className="size-3" />
          {task.relativeTime}
        </badge_1.Badge>
      );
    }
    return null;
  };
  const hasDetails =
    task.ingredients ||
    task.steps ||
    task.description ||
    task.historicalContext;
  return (
    <card_1.Card
      className={`transition-all duration-200 ${isCompleted ? "opacity-50" : ""} hover:shadow-md`}
    >
      <card_1.CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="pt-1">
            <checkbox_1.Checkbox
              checked={isCompleted}
              className="h-5 w-5"
              id={`task-${task.id}`}
              onCheckedChange={handleComplete}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
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
                <badge_1.Badge variant="secondary">
                  {formatDuration(task.durationMinutes)}
                </badge_1.Badge>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-4 text-muted-foreground text-xs">
              {task.confidence && (
                <span className="flex items-center gap-1">
                  <lucide_react_1.InfoIcon className="size-3" />
                  {Math.round(task.confidence * 100)}% confidence
                </span>
              )}
              {task.historicalContext && (
                <span className="flex items-center gap-1">
                  <lucide_react_1.SparklesIcon className="size-3" />
                  {task.historicalContext}
                </span>
              )}
            </div>

            {hasDetails && (
              <collapsible_1.Collapsible
                onOpenChange={setIsExpanded}
                open={isExpanded}
              >
                <collapsible_1.CollapsibleTrigger asChild>
                  <button_1.Button
                    className="mt-2 h-8 text-xs"
                    size="sm"
                    variant="ghost"
                  >
                    {isExpanded ? (
                      <>
                        <lucide_react_1.ChevronUpIcon className="mr-1 size-3" />
                        Less details
                      </>
                    ) : (
                      <>
                        <lucide_react_1.ChevronDownIcon className="mr-1 size-3" />
                        More details
                      </>
                    )}
                  </button_1.Button>
                </collapsible_1.CollapsibleTrigger>
                <collapsible_1.CollapsibleContent className="mt-2 space-y-2">
                  {task.ingredients && task.ingredients.length > 0 && (
                    <div className="text-sm">
                      <p className="mb-1 font-medium text-muted-foreground text-xs">
                        Ingredients:
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 text-xs">
                        {task.ingredients.map((ing, i) => (
                          <li key={i}>{ing}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {task.steps && task.steps.length > 0 && (
                    <div className="text-sm">
                      <p className="mb-1 font-medium text-muted-foreground text-xs">
                        Steps:
                      </p>
                      <ol className="list-inside list-decimal space-y-0.5 text-xs">
                        {task.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {task.historicalContext && (
                    <p className="text-muted-foreground text-xs italic">
                      {task.historicalContext}
                    </p>
                  )}
                </collapsible_1.CollapsibleContent>
              </collapsible_1.Collapsible>
            )}

            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <button_1.Button
                className="h-8 text-xs"
                onClick={() => onAssign?.(task.id)}
                size="sm"
                variant="outline"
              >
                <lucide_react_1.UserIcon className="mr-1 size-3" />
                {task.assignment ? task.assignment : "Assign"}
              </button_1.Button>
              {task.assignment && (
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <lucide_react_1.UserIcon className="size-3" />
                  </div>
                  <span className="text-xs">{task.assignment}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </card_1.CardContent>
    </card_1.Card>
  );
}
function TaskSectionComponent({ section, tasks, onComplete, onAssign }) {
  const [isOpen, setIsOpen] = (0, react_1.useState)(true);
  const config = SECTION_CONFIG[section];
  const totalTime = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const completedCount = 0;
  const formatTotalTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };
  return (
    <collapsible_1.Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <div className={`rounded-xl border ${COLOR_VARIANTS[config.color]}`}>
        <collapsible_1.CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">{config.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{config.label}</h3>
                  <badge_1.Badge className="text-xs" variant="secondary">
                    {tasks.length} tasks
                  </badge_1.Badge>
                </div>
                <p className="text-xs opacity-75">{config.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-sm">
                {formatTotalTime(totalTime)}
              </span>
              {isOpen ? (
                <lucide_react_1.ChevronUpIcon className="size-4" />
              ) : (
                <lucide_react_1.ChevronDownIcon className="size-4" />
              )}
            </div>
          </div>
        </collapsible_1.CollapsibleTrigger>
        <collapsible_1.CollapsibleContent>
          <separator_1.Separator />
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
        </collapsible_1.CollapsibleContent>
      </div>
    </collapsible_1.Collapsible>
  );
}
function TaskBreakdownDisplay({
  breakdown,
  onRegenerate,
  onExport,
  onSave,
  isGenerating,
  generationProgress,
}) {
  const [streamingTasks, setStreamingTasks] = (0, react_1.useState)([]);
  const [displayedTasks, setDisplayedTasks] = (0, react_1.useState)({
    prep: [],
    setup: [],
    cleanup: [],
  });
  (0, react_1.useEffect)(() => {
    if (!isGenerating) {
      setDisplayedTasks({
        prep: breakdown.prep,
        setup: breakdown.setup,
        cleanup: breakdown.cleanup,
      });
      setStreamingTasks([]);
      return;
    }
    const allTasks = [
      ...breakdown.prep.map((t) => ({
        section: "prep",
        task: t,
      })),
      ...breakdown.setup.map((t) => ({
        section: "setup",
        task: t,
      })),
      ...breakdown.cleanup.map((t) => ({
        section: "cleanup",
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
  const formatGrandTotal = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
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
          <lucide_react_1.SparklesIcon className="size-5 text-purple-500" />
          <h2 className="font-semibold text-xl">AI-Generated Task Breakdown</h2>
          <badge_1.Badge className="text-xs" variant="outline">
            Generated {eventDateFormatter.format(breakdown.generatedAt)}
          </badge_1.Badge>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button_1.Button
              disabled={isGenerating}
              onClick={onRegenerate}
              size="sm"
              variant="outline"
            >
              <lucide_react_1.RefreshCwIcon className="mr-1 size-3" />
              Regenerate
            </button_1.Button>
          )}
          {onExport && (
            <button_1.Button onClick={onExport} size="sm" variant="outline">
              <lucide_react_1.DownloadIcon className="mr-1 size-3" />
              Export
            </button_1.Button>
          )}
          {onSave && (
            <button_1.Button disabled={isGenerating} onClick={onSave} size="sm">
              Save Breakdown
            </button_1.Button>
          )}
        </div>
      </div>

      {isIntimate && (
        <badge_1.Badge className="mb-2" variant="secondary">
          Scaled for intimate gathering ({breakdown.guestCount} guests)
        </badge_1.Badge>
      )}

      {breakdown.historicalEventCount !== undefined && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <lucide_react_1.InfoIcon className="size-4" />
          <span>Based on {breakdown.historicalEventCount} similar events</span>
        </div>
      )}

      {breakdown.disclaimer && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <lucide_react_1.InfoIcon className="size-4" />
          <span>{breakdown.disclaimer}</span>
        </div>
      )}

      {isGenerating && (
        <card_1.Card className="border-purple-200 bg-purple-50">
          <card_1.CardContent className="py-4">
            <div className="flex items-center gap-3">
              <spinner_1.Spinner className="size-5 text-purple-500" />
              <div className="flex-1">
                <p className="font-medium">Generating task breakdown...</p>
                {generationProgress && (
                  <p className="text-muted-foreground text-sm">
                    {generationProgress}
                  </p>
                )}
              </div>
              <button_1.Button
                onClick={() => {
                  /* Stop generation logic */
                }}
                size="sm"
                variant="outline"
              >
                <lucide_react_1.StopCircleIcon className="mr-1 size-4" />
                Stop
              </button_1.Button>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <TaskSectionComponent section="prep" tasks={displayedTasks.prep} />
        <TaskSectionComponent section="setup" tasks={displayedTasks.setup} />
        <TaskSectionComponent
          section="cleanup"
          tasks={displayedTasks.cleanup}
        />
      </div>

      <card_1.Card>
        <card_1.CardHeader className="pb-2">
          <card_1.CardTitle className="font-medium text-sm">
            Total Time Estimate
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-bold text-2xl text-blue-600">
                {formatGrandTotal(totalPrepTime)}
              </p>
              <p className="text-muted-foreground text-xs">Prep</p>
            </div>
            <div>
              <p className="font-bold text-2xl text-green-600">
                {formatGrandTotal(totalSetupTime)}
              </p>
              <p className="text-muted-foreground text-xs">Setup</p>
            </div>
            <div>
              <p className="font-bold text-2xl text-orange-600">
                {formatGrandTotal(totalCleanupTime)}
              </p>
              <p className="text-muted-foreground text-xs">Cleanup</p>
            </div>
          </div>
          <separator_1.Separator className="my-4" />
          <div className="text-center">
            <p className="font-bold text-3xl">{formatGrandTotal(grandTotal)}</p>
            <p className="text-muted-foreground text-xs">Grand Total</p>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  );
}
function TaskBreakdownSkeleton({ sections = 3 }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <skeleton_1.Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <skeleton_1.Skeleton className="h-9 w-24" />
          <skeleton_1.Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: sections }).map((_, i) => (
          <card_1.Card key={i}>
            <card_1.CardHeader className="pb-2">
              <skeleton_1.Skeleton className="mb-2 h-6 w-32" />
              <skeleton_1.Skeleton className="h-4 w-24" />
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <skeleton_1.Skeleton className="h-24 w-full" key={j} />
              ))}
            </card_1.CardContent>
          </card_1.Card>
        ))}
      </div>

      <skeleton_1.Skeleton className="h-32 w-full" />
    </div>
  );
}
function GenerateTaskBreakdownModal({
  eventId,
  eventTitle,
  eventDate,
  guestCount,
  venueName,
  onGenerate,
  isOpen = false,
  onOpenChange,
}) {
  const [customInstructions, setCustomInstructions] = (0, react_1.useState)("");
  const [isGenerating, setIsGenerating] = (0, react_1.useState)(false);
  const [generationProgress, setGenerationProgress] = (0, react_1.useState)("");
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress("Analyzing event details...");
    try {
      await onGenerate(customInstructions || undefined);
      onOpenChange?.(false);
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <dialog_1.Dialog onOpenChange={onOpenChange} open={isOpen}>
      <dialog_1.DialogTrigger asChild>
        <button_1.Button>
          <lucide_react_1.SparklesIcon className="mr-2 size-4" />
          Generate Task Breakdown
        </button_1.Button>
      </dialog_1.DialogTrigger>
      <dialog_1.DialogContent className="max-w-lg">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="flex items-center gap-2">
            <lucide_react_1.SparklesIcon className="size-5 text-purple-500" />
            Generate Task Breakdown
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            AI will analyze your event details and create a comprehensive task
            breakdown based on historical data.
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

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
                  {dateFormatter.format(new Date(eventDate))}
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
            <lucide_react_1.InfoIcon className="mt-0.5 size-4 flex-shrink-0" />
            <p>
              This will use event details and similar historical events to
              generate prep, setup, and cleanup tasks with time estimates.
            </p>
          </div>

          {isGenerating && (
            <div className="flex items-center gap-2 text-sm">
              <spinner_1.Spinner className="size-4" />
              <span>{generationProgress}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button_1.Button
            disabled={isGenerating}
            onClick={() => onOpenChange?.(false)}
            variant="outline"
          >
            Cancel
          </button_1.Button>
          <button_1.Button disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating ? (
              <>
                <spinner_1.Spinner className="mr-2 size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <lucide_react_1.SparklesIcon className="mr-2 size-4" />
                Generate Breakdown
              </>
            )}
          </button_1.Button>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
}
