"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import {
  AlertTriangleIcon,
  ClipboardCopyIcon,
  RefreshCwIcon,
  SparklesIcon,
  StarIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface EventBriefingResponse {
  eventId: string;
  summary: string;
  wordCount: number;
  highlights: string[];
  criticalInfo: string[];
  generatedAt: string;
  eventTitle: string;
  eventDate: string;
  model: string;
}

interface EventBriefingCardProps {
  eventId: string;
  eventTitle: string;
}

export function EventBriefingCard({
  eventId,
  eventTitle,
}: EventBriefingCardProps) {
  const [briefing, setBriefing] = useState<EventBriefingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBriefing = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/summaries/${eventId}`);
      if (!response.ok) {
        throw new Error("Failed to generate briefing");
      }
      const data = (await response.json()) as EventBriefingResponse;
      setBriefing(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate briefing";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const copyToClipboard = useCallback(async () => {
    if (!briefing) return;

    const text = `EVENT BRIEFING: ${briefing.eventTitle}
Generated: ${new Date(briefing.generatedAt).toLocaleString()}

SUMMARY:
${briefing.summary}

KEY HIGHLIGHTS:
${briefing.highlights.map((h) => `- ${h}`).join("\n")}

CRITICAL INFO:
${briefing.criticalInfo.map((c) => `- ${c}`).join("\n")}
`.trim();

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Briefing copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [briefing]);

  // Loading state
  if (isLoading && !briefing) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            <CardTitle className="text-base">Quick Briefing</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <Spinner className="size-4" />
            <span>Generating event briefing...</span>
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !briefing) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-destructive" />
            <CardTitle className="text-base text-destructive">
              Briefing Error
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button
            className="mt-3"
            onClick={generateBriefing}
            size="sm"
            variant="outline"
          >
            <RefreshCwIcon className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state - prompt to generate
  if (!briefing) {
    return (
      <Card className="border-dashed border-border/70 bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            <CardTitle className="text-base">Quick Briefing</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground text-sm">
            Generate a concise event summary for team briefings and handoffs.
            Includes key details, allergens, and critical info.
          </p>
          <Button disabled={isLoading} onClick={generateBriefing} size="sm">
            <SparklesIcon className="mr-2 size-4" />
            Generate Briefing
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Has briefing
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(briefing.generatedAt));

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            <div>
              <CardTitle className="text-base">Quick Briefing</CardTitle>
              <p className="text-muted-foreground text-xs">
                Generated {formattedDate} ({briefing.wordCount} words)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Copy briefing to clipboard"
              onClick={copyToClipboard}
              size="sm"
              variant="ghost"
            >
              <ClipboardCopyIcon className="size-4" />
            </Button>
            <Button
              aria-label="Regenerate briefing"
              disabled={isLoading}
              onClick={generateBriefing}
              size="sm"
              variant="ghost"
            >
              <RefreshCwIcon
                className={`size-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary text */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-foreground/90 leading-relaxed">{briefing.summary}</p>
        </div>

        {/* Highlights */}
        {briefing.highlights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StarIcon className="size-4 text-emerald-600" />
              <span className="font-medium text-sm">Key Highlights</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {briefing.highlights.map((highlight, index) => (
                <Badge
                  className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                  key={index}
                  variant="outline"
                >
                  {highlight}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Critical Info */}
        {briefing.criticalInfo.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-amber-600" />
              <span className="font-medium text-sm">Critical Info</span>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <ul className="space-y-1">
                {briefing.criticalInfo.map((info, index) => (
                  <li className="text-amber-900 text-sm dark:text-amber-200" key={index}>
                    - {info}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <p className="text-muted-foreground text-xs">
          AI-generated content. Review before sharing.
        </p>
      </CardContent>
    </Card>
  );
}
