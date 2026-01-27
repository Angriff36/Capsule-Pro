"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardCopyIcon,
  DownloadIcon,
  FileTextIcon,
  InfoIcon,
  LightbulbIcon,
  RefreshCwIcon,
  SparklesIcon,
  StarIcon,
  StopCircleIcon,
  TrendingUpIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  GeneratedEventSummary,
  SummaryItem,
} from "../actions/event-summary";

type EventSummaryDisplayProps = {
  eventId: string;
  eventTitle: string;
  initialSummary?: GeneratedEventSummary | null;
  onGenerate?: () => Promise<GeneratedEventSummary>;
  onDelete?: () => Promise<void>;
};

const SEVERITY_CONFIG = {
  info: {
    icon: InfoIcon,
    color: "bg-blue-50 border-blue-200 text-blue-900",
    badge: "bg-blue-100 text-blue-800",
    iconColor: "text-blue-500",
  },
  success: {
    icon: TrendingUpIcon,
    color: "bg-green-50 border-green-200 text-green-900",
    badge: "bg-green-100 text-green-800",
    iconColor: "text-green-500",
  },
  warning: {
    icon: AlertTriangleIcon,
    color: "bg-amber-50 border-amber-200 text-amber-900",
    badge: "bg-amber-100 text-amber-800",
    iconColor: "text-amber-500",
  },
  critical: {
    icon: AlertTriangleIcon,
    color: "bg-red-50 border-red-200 text-red-900",
    badge: "bg-red-100 text-red-800",
    iconColor: "text-red-500",
  },
};

const SECTION_CONFIG = {
  highlights: {
    label: "Highlights",
    icon: StarIcon,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Key successes and achievements",
  },
  issues: {
    label: "Issues",
    icon: AlertTriangleIcon,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Challenges and areas needing attention",
  },
  financialPerformance: {
    label: "Financial Performance",
    icon: TrendingUpIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Budget vs actuals analysis",
  },
  clientFeedback: {
    label: "Client Feedback",
    icon: UsersIcon,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "Client satisfaction and feedback",
  },
  insights: {
    label: "Insights",
    icon: LightbulbIcon,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    description: "Actionable recommendations",
  },
};

function SummaryItemCard({ item }: { item: SummaryItem }) {
  const config = SEVERITY_CONFIG[item.severity || "info"];
  const Icon = config.icon;

  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${config.color}`}>
      <Icon className={`mt-0.5 size-5 flex-shrink-0 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{item.title}</span>
          {item.metric && (
            <Badge className="text-xs" variant="secondary">
              {item.metric}
            </Badge>
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
}: {
  id: string;
  title: string;
  items: SummaryItem[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasItems = items && items.length > 0;

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger
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
          {hasItems && <Badge variant="secondary">{items.length} items</Badge>}
          {isOpen ? (
            <ChevronUpIcon className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent
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
      </CollapsibleContent>
    </Collapsible>
  );
}

export function EventSummaryDisplay({
  eventId,
  eventTitle,
  initialSummary,
  onGenerate,
  onDelete,
}: EventSummaryDisplayProps) {
  const [summary, setSummary] = useState<
    GeneratedEventSummary | null | undefined
  >(initialSummary);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [streamingSections, setStreamingSections] = useState<string[]>([]);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  const handleGenerate = useCallback(async () => {
    if (!onGenerate) {
      return;
    }

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
      toast.success("Summary generated successfully");
    } catch (error) {
      clearInterval(progressInterval);
      setGenerationProgress("Failed to generate summary. Please try again.");
      toast.error("Failed to generate summary");
      console.error("Summary generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerate]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) {
      return;
    }

    try {
      await onDelete();
      setSummary(null);
      toast.success("Summary deleted");
    } catch (error) {
      toast.error("Failed to delete summary");
      console.error("Delete failed:", error);
    }
  }, [onDelete]);

  const handleCopyToClipboard = useCallback(() => {
    if (!summary) {
      return;
    }

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
    toast.success("Summary copied to clipboard");
  }, [summary, eventTitle]);

  const handleExportPDF = useCallback(() => {
    if (!summary) {
      return;
    }

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
    toast.success("Summary exported");
  }, [summary, eventTitle]);

  const handleRating = useCallback((rating: number) => {
    setUserRating(rating);
    setShowRatingDialog(false);
    toast.success("Thank you for your feedback!");
  }, []);

  if (isGenerating && !summary) {
    return <EventSummarySkeleton />;
  }

  if (!summary) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileTextIcon className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg mb-2">No summary generated yet</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
            Generate an AI-powered executive summary to get insights about this
            event&apos;s performance, highlights, and actionable
            recommendations.
          </p>
          {onGenerate && (
            <Button disabled={isGenerating} onClick={handleGenerate}>
              <SparklesIcon className="mr-2 size-4" />
              Generate Executive Summary
            </Button>
          )}
          {isGenerating && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Spinner className="size-4" />
              <span>{generationProgress}</span>
            </div>
          )}
        </CardContent>
      </Card>
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
            <SparklesIcon className="size-5 text-primary" />
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
          <Button
            aria-label="Copy summary to clipboard"
            onClick={handleCopyToClipboard}
            size="sm"
            variant="outline"
          >
            <ClipboardCopyIcon className="mr-2 size-4" />
            Copy
          </Button>
          <Button
            aria-label="Export summary"
            onClick={() => setShowExportDialog(true)}
            size="sm"
            variant="outline"
          >
            <DownloadIcon className="mr-2 size-4" />
            Export
          </Button>
          <Button
            aria-label="Rate this summary"
            onClick={() => setShowRatingDialog(true)}
            size="sm"
            variant="outline"
          >
            <StarIcon className="mr-2 size-4" />
            Rate
          </Button>
          {onGenerate && (
            <Button
              aria-label="Regenerate summary"
              disabled={isGenerating}
              onClick={handleGenerate}
              size="sm"
              variant="outline"
            >
              <RefreshCwIcon
                className={`mr-2 size-4 ${isGenerating ? "animate-spin" : ""}`}
              />
              Regenerate
            </Button>
          )}
          {onDelete && (
            <Button
              aria-label="Delete summary"
              onClick={handleDelete}
              size="sm"
              variant="outline"
            >
              <XIcon className="mr-2 size-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {isGenerating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Spinner className="size-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Generating summary...</p>
                <p className="text-muted-foreground text-sm">
                  {generationProgress}
                </p>
              </div>
              <Progress className="w-32" value={45} />
              <Button
                onClick={() => setIsGenerating(false)}
                size="sm"
                variant="outline"
              >
                <StopCircleIcon className="mr-1 size-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="bg-muted/50 border-muted">
        <InfoIcon className="size-4" />
        <span className="text-sm">
          AI-generated content may contain sensitive information. Review before
          sharing.
        </span>
      </Alert>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p className="text-base leading-relaxed">{summary.overallSummary}</p>
      </div>

      <Separator />

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

      <Dialog onOpenChange={setShowRatingDialog} open={showRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate this summary</DialogTitle>
            <DialogDescription>
              How accurate and helpful was this AI-generated summary?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                aria-label={`Rate ${rating} out of 5 stars`}
                className="rounded-full"
                key={rating}
                onClick={() => handleRating(rating)}
                size="lg"
                variant="ghost"
              >
                <StarIcon
                  className={`size-8 ${
                    userRating && rating <= userRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowRatingDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setShowExportDialog} open={showExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Summary</DialogTitle>
            <DialogDescription>
              Choose how you&apos;d like to export this summary
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              className="justify-start"
              onClick={() => {
                setShowExportDialog(false);
                handleCopyToClipboard();
              }}
              variant="outline"
            >
              <ClipboardCopyIcon className="mr-2 size-4" />
              Copy to Clipboard
            </Button>
            <Button
              className="justify-start"
              onClick={() => {
                setShowExportDialog(false);
                handleExportPDF();
              }}
              variant="outline"
            >
              <DownloadIcon className="mr-2 size-4" />
              Download as HTML
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowExportDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Alert({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
}

export function EventSummarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <Skeleton className="h-24 w-full rounded-xl" />

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="rounded-xl border p-4" key={i}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type GenerateEventSummaryModalProps = {
  eventId: string;
  eventTitle: string;
  onGenerate: () => Promise<GeneratedEventSummary>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function GenerateEventSummaryModal({
  eventId,
  eventTitle,
  onGenerate,
  isOpen = false,
  onOpenChange,
}: GenerateEventSummaryModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");

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
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogTrigger asChild>
        <Button>
          <SparklesIcon className="mr-2 size-4" />
          Generate Executive Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            Generate Executive Summary
          </DialogTitle>
          <DialogDescription>
            AI will analyze this event and generate a comprehensive summary
            including highlights, issues, financial performance, and insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium text-sm mb-2">Event Details</h4>
            <p className="text-sm">
              <span className="text-muted-foreground">Event:</span> {eventTitle}
            </p>
          </div>

          <div className="flex items-start gap-2 text-muted-foreground text-xs">
            <InfoIcon className="mt-0.5 size-4 flex-shrink-0" />
            <p>
              This summary will include event highlights, issues encountered,
              financial analysis, and actionable insights based on available
              data.
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
                Generate Summary
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
