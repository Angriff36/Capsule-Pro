"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSummaryDisplay = EventSummaryDisplay;
exports.EventSummarySkeleton = EventSummarySkeleton;
exports.GenerateEventSummaryModal = GenerateEventSummaryModal;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const collapsible_1 = require("@repo/design-system/components/ui/collapsible");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const progress_1 = require("@repo/design-system/components/ui/progress");
const separator_1 = require("@repo/design-system/components/ui/separator");
const skeleton_1 = require("@repo/design-system/components/ui/skeleton");
const spinner_1 = require("@repo/design-system/components/ui/spinner");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const SEVERITY_CONFIG = {
  info: {
    icon: lucide_react_1.InfoIcon,
    color: "bg-blue-50 border-blue-200 text-blue-900",
    badge: "bg-blue-100 text-blue-800",
    iconColor: "text-blue-500",
  },
  success: {
    icon: lucide_react_1.TrendingUpIcon,
    color: "bg-green-50 border-green-200 text-green-900",
    badge: "bg-green-100 text-green-800",
    iconColor: "text-green-500",
  },
  warning: {
    icon: lucide_react_1.AlertTriangleIcon,
    color: "bg-amber-50 border-amber-200 text-amber-900",
    badge: "bg-amber-100 text-amber-800",
    iconColor: "text-amber-500",
  },
  critical: {
    icon: lucide_react_1.AlertTriangleIcon,
    color: "bg-red-50 border-red-200 text-red-900",
    badge: "bg-red-100 text-red-800",
    iconColor: "text-red-500",
  },
};
const SECTION_CONFIG = {
  highlights: {
    label: "Highlights",
    icon: lucide_react_1.StarIcon,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Key successes and achievements",
  },
  issues: {
    label: "Issues",
    icon: lucide_react_1.AlertTriangleIcon,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Challenges and areas needing attention",
  },
  financialPerformance: {
    label: "Financial Performance",
    icon: lucide_react_1.TrendingUpIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Budget vs actuals analysis",
  },
  clientFeedback: {
    label: "Client Feedback",
    icon: lucide_react_1.UsersIcon,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "Client satisfaction and feedback",
  },
  insights: {
    label: "Insights",
    icon: lucide_react_1.LightbulbIcon,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    description: "Actionable recommendations",
  },
};
function SummaryItemCard({ item }) {
  const config = SEVERITY_CONFIG[item.severity || "info"];
  const Icon = config.icon;
  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${config.color}`}>
      <Icon className={`mt-0.5 size-5 flex-shrink-0 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{item.title}</span>
          {item.metric && (
            <badge_1.Badge className="text-xs" variant="secondary">
              {item.metric}
            </badge_1.Badge>
          )}
        </div>
        {item.description && (
          <p className="text-sm opacity-90">{item.description}</p>
        )}
      </div>
    </div>
  );
}
function SummarySection({
  id,
  title,
  items,
  icon: Icon,
  color,
  bgColor,
  description,
  defaultOpen = false,
}) {
  const [isOpen, setIsOpen] = (0, react_1.useState)(defaultOpen);
  const hasItems = items && items.length > 0;
  return (
    <collapsible_1.Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <collapsible_1.CollapsibleTrigger
        aria-controls={`${id}-content`}
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/50 ${bgColor}`}
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${color} bg-white/50`}>
            <Icon className="size-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasItems && (
            <badge_1.Badge variant="secondary">
              {items.length} items
            </badge_1.Badge>
          )}
          {isOpen ? (
            <lucide_react_1.ChevronUpIcon className="size-4 text-muted-foreground" />
          ) : (
            <lucide_react_1.ChevronDownIcon className="size-4 text-muted-foreground" />
          )}
        </div>
      </collapsible_1.CollapsibleTrigger>
      <collapsible_1.CollapsibleContent
        className="mt-2 space-y-2 px-4 pb-4"
        id={`${id}-content`}
      >
        {hasItems ? (
          items.map((item, index) => (
            <SummaryItemCard item={item} key={index} />
          ))
        ) : (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No {title.toLowerCase()} to display
          </p>
        )}
      </collapsible_1.CollapsibleContent>
    </collapsible_1.Collapsible>
  );
}
function EventSummaryDisplay({
  eventId,
  eventTitle,
  initialSummary,
  onGenerate,
  onDelete,
}) {
  const [summary, setSummary] = (0, react_1.useState)(initialSummary);
  const [isGenerating, setIsGenerating] = (0, react_1.useState)(false);
  const [generationProgress, setGenerationProgress] = (0, react_1.useState)("");
  const [streamingSections, setStreamingSections] = (0, react_1.useState)([]);
  const [showRatingDialog, setShowRatingDialog] = (0, react_1.useState)(false);
  const [userRating, setUserRating] = (0, react_1.useState)(null);
  const [showExportDialog, setShowExportDialog] = (0, react_1.useState)(false);
  (0, react_1.useEffect)(() => {
    setSummary(initialSummary);
  }, [initialSummary]);
  const handleGenerate = (0, react_1.useCallback)(async () => {
    if (!onGenerate) return;
    setIsGenerating(true);
    setGenerationProgress("Analyzing event data...");
    setStreamingSections([]);
    const progressMessages = [
      "Analyzing event data...",
      "Reviewing financial metrics...",
      "Processing staff assignments...",
      "Generating insights...",
      "Finalizing summary...",
    ];
    let messageIndex = 0;
    const progressInterval = setInterval(() => {
      if (messageIndex < progressMessages.length) {
        setGenerationProgress(progressMessages[messageIndex]);
        messageIndex++;
      }
    }, 3000);
    try {
      const result = await onGenerate();
      clearInterval(progressInterval);
      setGenerationProgress("");
      setSummary(result);
      setStreamingSections([
        "highlights",
        "issues",
        "financialPerformance",
        "clientFeedback",
        "insights",
      ]);
      sonner_1.toast.success("Summary generated successfully");
    } catch (error) {
      clearInterval(progressInterval);
      setGenerationProgress("Failed to generate summary. Please try again.");
      sonner_1.toast.error("Failed to generate summary");
      console.error("Summary generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerate]);
  const handleDelete = (0, react_1.useCallback)(async () => {
    if (!onDelete) return;
    try {
      await onDelete();
      setSummary(null);
      sonner_1.toast.success("Summary deleted");
    } catch (error) {
      sonner_1.toast.error("Failed to delete summary");
      console.error("Delete failed:", error);
    }
  }, [onDelete]);
  const handleCopyToClipboard = (0, react_1.useCallback)(() => {
    if (!summary) return;
    const text = `
EVENT SUMMARY: ${eventTitle}
Generated: ${summary.generatedAt.toLocaleString()}
Duration: ${summary.generationDurationMs}ms

OVERALL SUMMARY:
${summary.overallSummary}

HIGHLIGHTS:
${summary.highlights.map((h) => `- ${h.title}: ${h.description}`).join("\n")}

ISSUES:
${summary.issues.map((i) => `- ${i.title}: ${i.description}`).join("\n")}

FINANCIAL PERFORMANCE:
${summary.financialPerformance.map((f) => `- ${f.title}: ${f.description}`).join("\n")}

CLIENT FEEDBACK:
${summary.clientFeedback.map((c) => `- ${c.title}: ${c.description}`).join("\n")}

INSIGHTS:
${summary.insights.map((i) => `- ${i.title}: ${i.description}`).join("\n")}
    `.trim();
    navigator.clipboard.writeText(text);
    sonner_1.toast.success("Summary copied to clipboard");
  }, [summary, eventTitle]);
  const handleExportPDF = (0, react_1.useCallback)(() => {
    if (!summary) return;
    const content = `
      <html>
        <head>
          <title>Event Summary - ${eventTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; }
            h2 { color: #555; margin-top: 24px; }
            .metric { background: #f5f5f5; padding: 8px 12px; border-radius: 4px; margin: 4px 0; }
            .highlight { border-left: 4px solid #22c55e; padding-left: 12px; }
            .issue { border-left: 4px solid #f59e0b; padding-left: 12px; }
            .insight { border-left: 4px solid #6366f1; padding-left: 12px; }
          </style>
        </head>
        <body>
          <h1>Event Summary: ${eventTitle}</h1>
          <p>Generated: ${summary.generatedAt.toLocaleString()}</p>
          <p><em>AI-generated content. Review before sharing.</em></p>

          <h2>Overall Summary</h2>
          <p>${summary.overallSummary}</p>

          <h2>Highlights</h2>
          ${summary.highlights.map((h) => `<div class="highlight"><strong>${h.title}</strong><p>${h.description}</p></div>`).join("")}

          <h2>Issues</h2>
          ${summary.issues.map((i) => `<div class="issue"><strong>${i.title}</strong><p>${i.description}</p></div>`).join("")}

          <h2>Financial Performance</h2>
          ${summary.financialPerformance.map((f) => `<div class="metric"><strong>${f.title}</strong>: ${f.metric || f.description}</div>`).join("")}

          <h2>Insights</h2>
          ${summary.insights.map((i) => `<div class="insight"><strong>${i.title}</strong><p>${i.description}</p></div>`).join("")}
        </body>
      </html>
    `;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventTitle.replace(/[^a-z0-9]/gi, "_")}_summary.html`;
    link.click();
    URL.revokeObjectURL(url);
    sonner_1.toast.success("Summary exported");
  }, [summary, eventTitle]);
  const handleRating = (0, react_1.useCallback)((rating) => {
    setUserRating(rating);
    setShowRatingDialog(false);
    sonner_1.toast.success("Thank you for your feedback!");
  }, []);
  if (isGenerating && !summary) {
    return <EventSummarySkeleton />;
  }
  if (!summary) {
    return (
      <card_1.Card className="border-dashed">
        <card_1.CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <lucide_react_1.FileTextIcon className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg mb-2">No summary generated yet</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
            Generate an AI-powered executive summary to get insights about this
            event&apos;s performance, highlights, and actionable
            recommendations.
          </p>
          {onGenerate && (
            <button_1.Button disabled={isGenerating} onClick={handleGenerate}>
              <lucide_react_1.SparklesIcon className="mr-2 size-4" />
              Generate Executive Summary
            </button_1.Button>
          )}
          {isGenerating && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <spinner_1.Spinner className="size-4" />
              <span>{generationProgress}</span>
            </div>
          )}
        </card_1.CardContent>
      </card_1.Card>
    );
  }
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <div
      aria-label="Event Executive Summary"
      className="space-y-6"
      role="region"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <lucide_react_1.SparklesIcon className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-xl">Executive Summary</h2>
            <p className="text-muted-foreground text-sm">
              Generated {dateFormatter.format(summary.generatedAt)}
              {summary.generationDurationMs && (
                <span className="ml-2">
                  ({(summary.generationDurationMs / 1000).toFixed(1)}s)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button_1.Button
            aria-label="Copy summary to clipboard"
            onClick={handleCopyToClipboard}
            size="sm"
            variant="outline"
          >
            <lucide_react_1.ClipboardCopyIcon className="mr-2 size-4" />
            Copy
          </button_1.Button>
          <button_1.Button
            aria-label="Export summary"
            onClick={() => setShowExportDialog(true)}
            size="sm"
            variant="outline"
          >
            <lucide_react_1.DownloadIcon className="mr-2 size-4" />
            Export
          </button_1.Button>
          <button_1.Button
            aria-label="Rate this summary"
            onClick={() => setShowRatingDialog(true)}
            size="sm"
            variant="outline"
          >
            <lucide_react_1.StarIcon className="mr-2 size-4" />
            Rate
          </button_1.Button>
          {onGenerate && (
            <button_1.Button
              aria-label="Regenerate summary"
              disabled={isGenerating}
              onClick={handleGenerate}
              size="sm"
              variant="outline"
            >
              <lucide_react_1.RefreshCwIcon
                className={`mr-2 size-4 ${isGenerating ? "animate-spin" : ""}`}
              />
              Regenerate
            </button_1.Button>
          )}
          {onDelete && (
            <button_1.Button
              aria-label="Delete summary"
              onClick={handleDelete}
              size="sm"
              variant="outline"
            >
              <lucide_react_1.XIcon className="mr-2 size-4" />
              Delete
            </button_1.Button>
          )}
        </div>
      </div>

      {isGenerating && (
        <card_1.Card className="border-primary/20 bg-primary/5">
          <card_1.CardContent className="py-4">
            <div className="flex items-center gap-4">
              <spinner_1.Spinner className="size-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Generating summary...</p>
                <p className="text-muted-foreground text-sm">
                  {generationProgress}
                </p>
              </div>
              <progress_1.Progress className="w-32" value={45} />
              <button_1.Button
                onClick={() => setIsGenerating(false)}
                size="sm"
                variant="outline"
              >
                <lucide_react_1.StopCircleIcon className="mr-1 size-4" />
                Cancel
              </button_1.Button>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      )}

      <Alert className="bg-muted/50 border-muted">
        <lucide_react_1.InfoIcon className="size-4" />
        <span className="text-sm">
          AI-generated content may contain sensitive information. Review before
          sharing.
        </span>
      </Alert>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p className="text-base leading-relaxed">{summary.overallSummary}</p>
      </div>

      <separator_1.Separator />

      <div className="grid gap-4">
        <SummarySection
          bgColor={SECTION_CONFIG.highlights.bgColor}
          color={SECTION_CONFIG.highlights.color}
          defaultOpen={streamingSections.includes("highlights")}
          description={SECTION_CONFIG.highlights.description}
          icon={SECTION_CONFIG.highlights.icon}
          id="highlights"
          items={summary.highlights}
          title={SECTION_CONFIG.highlights.label}
        />

        <SummarySection
          bgColor={SECTION_CONFIG.issues.bgColor}
          color={SECTION_CONFIG.issues.color}
          defaultOpen={streamingSections.includes("issues")}
          description={SECTION_CONFIG.issues.description}
          icon={SECTION_CONFIG.issues.icon}
          id="issues"
          items={summary.issues}
          title={SECTION_CONFIG.issues.label}
        />

        <SummarySection
          bgColor={SECTION_CONFIG.financialPerformance.bgColor}
          color={SECTION_CONFIG.financialPerformance.color}
          defaultOpen={streamingSections.includes("financialPerformance")}
          description={SECTION_CONFIG.financialPerformance.description}
          icon={SECTION_CONFIG.financialPerformance.icon}
          id="financial"
          items={summary.financialPerformance}
          title={SECTION_CONFIG.financialPerformance.label}
        />

        <SummarySection
          bgColor={SECTION_CONFIG.clientFeedback.bgColor}
          color={SECTION_CONFIG.clientFeedback.color}
          defaultOpen={streamingSections.includes("clientFeedback")}
          description={SECTION_CONFIG.clientFeedback.description}
          icon={SECTION_CONFIG.clientFeedback.icon}
          id="feedback"
          items={summary.clientFeedback}
          title={SECTION_CONFIG.clientFeedback.label}
        />

        <SummarySection
          bgColor={SECTION_CONFIG.insights.bgColor}
          color={SECTION_CONFIG.insights.color}
          defaultOpen={streamingSections.includes("insights")}
          description={SECTION_CONFIG.insights.description}
          icon={SECTION_CONFIG.insights.icon}
          id="insights"
          items={summary.insights}
          title={SECTION_CONFIG.insights.label}
        />
      </div>

      <dialog_1.Dialog
        onOpenChange={setShowRatingDialog}
        open={showRatingDialog}
      >
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Rate this summary</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              How accurate and helpful was this AI-generated summary?
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button_1.Button
                aria-label={`Rate ${rating} out of 5 stars`}
                className="rounded-full"
                key={rating}
                onClick={() => handleRating(rating)}
                size="lg"
                variant="ghost"
              >
                <lucide_react_1.StarIcon
                  className={`size-8 ${
                    userRating && rating <= userRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button_1.Button>
            ))}
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button
              onClick={() => setShowRatingDialog(false)}
              variant="outline"
            >
              Cancel
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      <dialog_1.Dialog
        onOpenChange={setShowExportDialog}
        open={showExportDialog}
      >
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Export Summary</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Choose how you&apos;d like to export this summary
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="grid gap-3 py-4">
            <button_1.Button
              className="justify-start"
              onClick={() => {
                setShowExportDialog(false);
                handleCopyToClipboard();
              }}
              variant="outline"
            >
              <lucide_react_1.ClipboardCopyIcon className="mr-2 size-4" />
              Copy to Clipboard
            </button_1.Button>
            <button_1.Button
              className="justify-start"
              onClick={() => {
                setShowExportDialog(false);
                handleExportPDF();
              }}
              variant="outline"
            >
              <lucide_react_1.DownloadIcon className="mr-2 size-4" />
              Download as HTML
            </button_1.Button>
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button
              onClick={() => setShowExportDialog(false)}
              variant="outline"
            >
              Cancel
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>
  );
}
function Alert({ children, className }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
}
function EventSummarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <skeleton_1.Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <skeleton_1.Skeleton className="h-9 w-20" />
          <skeleton_1.Skeleton className="h-9 w-20" />
          <skeleton_1.Skeleton className="h-9 w-20" />
        </div>
      </div>

      <skeleton_1.Skeleton className="h-24 w-full rounded-xl" />

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="rounded-xl border p-4" key={i}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <skeleton_1.Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <skeleton_1.Skeleton className="h-5 w-32" />
                  <skeleton_1.Skeleton className="h-4 w-48" />
                </div>
              </div>
              <skeleton_1.Skeleton className="h-6 w-12" />
            </div>
            <div className="mt-4 space-y-2">
              <skeleton_1.Skeleton className="h-16 w-full" />
              <skeleton_1.Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function GenerateEventSummaryModal({
  eventId,
  eventTitle,
  onGenerate,
  isOpen = false,
  onOpenChange,
}) {
  const [isGenerating, setIsGenerating] = (0, react_1.useState)(false);
  const [generationProgress, setGenerationProgress] = (0, react_1.useState)("");
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress("Analyzing event details...");
    try {
      await onGenerate();
      onOpenChange?.(false);
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };
  return (
    <dialog_1.Dialog onOpenChange={onOpenChange} open={isOpen}>
      <dialog_1.DialogTrigger asChild>
        <button_1.Button>
          <lucide_react_1.SparklesIcon className="mr-2 size-4" />
          Generate Executive Summary
        </button_1.Button>
      </dialog_1.DialogTrigger>
      <dialog_1.DialogContent className="max-w-lg">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="flex items-center gap-2">
            <lucide_react_1.SparklesIcon className="size-5 text-primary" />
            Generate Executive Summary
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            AI will analyze this event and generate a comprehensive summary
            including highlights, issues, financial performance, and insights.
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium text-sm mb-2">Event Details</h4>
            <p className="text-sm">
              <span className="text-muted-foreground">Event:</span> {eventTitle}
            </p>
          </div>

          <div className="flex items-start gap-2 text-muted-foreground text-xs">
            <lucide_react_1.InfoIcon className="mt-0.5 size-4 flex-shrink-0" />
            <p>
              This summary will include event highlights, issues encountered,
              financial analysis, and actionable insights based on available
              data.
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
                Generate Summary
              </>
            )}
          </button_1.Button>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
}
