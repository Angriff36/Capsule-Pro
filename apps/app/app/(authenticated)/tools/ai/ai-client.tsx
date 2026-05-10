/**
 * @module AiClient
 * @intent Client-side UI for AI integrations: suggestions and event summaries
 * @responsibility Render AI-powered suggestions with action handling, and event summary generation
 * @domain Tools
 * @tags ai, suggestions, summaries, tools
 * @canonical true
 */

"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
  ListChecks,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { BulkTaskGeneratorTab } from "./bulk-task-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SuggestionType =
  | "deadline_alert"
  | "resource_conflict"
  | "capacity_warning"
  | "optimization"
  | "follow_up"
  | "data_inconsistency"
  | "actionable_insight";

type SuggestionCategory =
  | "events"
  | "kitchen"
  | "scheduling"
  | "crm"
  | "inventory"
  | "general";

type SuggestionPriority = "high" | "medium" | "low";

type Timeframe = "today" | "week" | "month";

interface NavigateAction {
  type: "navigate";
  path: string;
}

interface ApiCallAction {
  type: "api_call";
  method: string;
  endpoint: string;
  payload: Record<string, unknown>;
}

type SuggestionAction = NavigateAction | ApiCallAction;

interface Suggestion {
  id: string;
  type: SuggestionType;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  title: string;
  description: string;
  action: SuggestionAction;
  estimatedImpact: string;
  dismissed: boolean;
}

interface SuggestionsContext {
  timeframe: Timeframe;
  totalEvents: number;
  incompleteTasks: number;
  inventoryAlerts: number;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
  summary: string;
  generatedAt: string;
  context: SuggestionsContext;
}

interface EventSummaryResponse {
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const TYPE_LABELS: Record<SuggestionType, string> = {
  deadline_alert: "Deadline Alert",
  resource_conflict: "Resource Conflict",
  capacity_warning: "Capacity Warning",
  optimization: "Optimization",
  follow_up: "Follow Up",
  data_inconsistency: "Data Inconsistency",
  actionable_insight: "Actionable Insight",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function priorityVariant(
  priority: SuggestionPriority
): "destructive" | "default" | "secondary" | "outline" {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
  }
}

function priorityIcon(priority: SuggestionPriority) {
  switch (priority) {
    case "high":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case "medium":
      return <AlertCircle className="h-3.5 w-3.5" />;
    case "low":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
}

function categoryVariant(
  category: SuggestionCategory
): "default" | "secondary" | "outline" {
  switch (category) {
    case "events":
    case "kitchen":
      return "default";
    case "scheduling":
    case "crm":
      return "secondary";
    default:
      return "outline";
  }
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card tone="canvas">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Suggestions Tab
// ---------------------------------------------------------------------------

function SuggestionsTab() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<Timeframe>("today");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SuggestionsResponse | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/ai/suggestions?maxSuggestions=5&timeframe=${timeframe}`
      );
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const json = (await res.json()) as SuggestionsResponse;
      setData(json);
      toast.success("Suggestions generated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate suggestions";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  const handleAction = useCallback(
    async (action: SuggestionAction) => {
      if (action.type === "navigate") {
        router.push(action.path);
      } else if (action.type === "api_call") {
        try {
          const res = await apiFetch(action.endpoint, {
            method: action.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.payload),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(
              (err as { message?: string }).message ??
                `Request failed (${res.status})`
            );
            return;
          }
          toast.success("Action completed successfully");
        } catch {
          toast.error("Failed to execute action");
        }
      }
    },
    [router]
  );

  const activeSuggestions = data?.suggestions.filter((s) => !s.dismissed) ?? [];
  const highCount = activeSuggestions.filter(
    (s) => s.priority === "high"
  ).length;

  return (
    <div className="space-y-6">
      {/* Timeframe selector + generate button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Timeframe</Label>
          <div className="flex gap-2">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                size="sm"
                variant={timeframe === tf.value ? "default" : "outline"}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
        <Button disabled={loading} onClick={fetchSuggestions}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Suggestions
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive" tone="canvas">
          <CardContent className="flex items-center gap-2 p-4 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      {data?.context && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Lightbulb}
            label="Total Suggestions"
            value={activeSuggestions.length}
          />
          <StatCard
            icon={AlertTriangle}
            label="High Priority"
            value={highCount}
          />
          <StatCard
            icon={Calendar}
            label="Events"
            value={data.context.totalEvents}
          />
          <StatCard
            icon={Clock}
            label="Incomplete Tasks"
            value={data.context.incompleteTasks}
          />
        </div>
      )}

      {/* Summary text */}
      {data?.summary && (
        <Card tone="canvas">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Brain className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{data.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions list */}
      {data && activeSuggestions.length === 0 && (
        <Card tone="canvas">
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <Lightbulb className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No suggestions for this timeframe. Everything looks good.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {activeSuggestions.map((suggestion) => (
          <Card key={suggestion.id} tone="canvas">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">{suggestion.title}</CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    className="gap-1"
                    variant={priorityVariant(suggestion.priority)}
                  >
                    {priorityIcon(suggestion.priority)}
                    {suggestion.priority}
                  </Badge>
                  <Badge variant={categoryVariant(suggestion.category)}>
                    {suggestion.category}
                  </Badge>
                  <Badge variant="outline">
                    {TYPE_LABELS[suggestion.type] ?? suggestion.type}
                  </Badge>
                </div>
              </div>
              {suggestion.estimatedImpact && (
                <CardDescription>
                  Estimated impact: {suggestion.estimatedImpact}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-4 text-sm text-muted-foreground">
                {suggestion.description}
              </p>
              {suggestion.action.type === "navigate" && (
                <Button
                  onClick={() => handleAction(suggestion.action)}
                  size="sm"
                  variant="outline"
                >
                  <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                  Take Action
                </Button>
              )}
              {suggestion.action.type === "api_call" && (
                <Button
                  onClick={() => handleAction(suggestion.action)}
                  size="sm"
                  variant="outline"
                >
                  <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                  Execute
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generated timestamp */}
      {data?.generatedAt && (
        <p className="text-center text-xs text-muted-foreground">
          Generated at {formatTimestamp(data.generatedAt)}
        </p>
      )}

      {/* Empty initial state */}
      {!(data || loading || error) && (
        <Card tone="canvas">
          <CardContent className="flex flex-col items-center gap-2 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm font-medium">No suggestions yet</p>
            <p className="text-sm text-muted-foreground">
              Select a timeframe and click &quot;Generate Suggestions&quot; to
              get AI-powered recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Summaries Tab
// ---------------------------------------------------------------------------

function EventSummariesTab() {
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EventSummaryResponse | null>(null);

  const generateSummary = useCallback(async () => {
    const trimmed = eventId.trim();
    if (!trimmed) {
      toast.error("Please enter an event ID");
      return;
    }
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await apiFetch(
        `/api/ai/summaries/${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const json = (await res.json()) as EventSummaryResponse;
      setSummary(json);
      toast.success("Summary generated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate summary";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="event-id-input">Event ID</Label>
          <Input
            id="event-id-input"
            onChange={(e) => setEventId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                generateSummary();
              }
            }}
            placeholder="Enter event ID..."
            value={eventId}
          />
        </div>
        <Button disabled={loading} onClick={generateSummary}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Generate Summary
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive" tone="canvas">
          <CardContent className="flex items-center gap-2 p-4 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading indicator */}
      {loading && (
        <Card tone="canvas">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Generating summary...</p>
              <p className="text-xs text-muted-foreground">
                This may take a few seconds while the AI analyzes the event
                data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary result */}
      {summary && !loading && (
        <div className="space-y-4">
          {/* Event header */}
          <Card tone="canvas">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {summary.eventTitle}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
                    {new Date(summary.eventDate).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                </div>
                <Badge className="gap-1" variant="outline">
                  <Sparkles className="h-3 w-3" />
                  {summary.model}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {summary.summary}
              </p>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{summary.wordCount} words</span>
                <span>Generated {formatTimestamp(summary.generatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Highlights */}
          {summary.highlights.length > 0 && (
            <Card tone="canvas">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.highlights.map((highlight, i) => (
                    <li className="flex items-start gap-2 text-sm" key={i}>
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Critical Info */}
          {summary.criticalInfo.length > 0 && (
            <Card className="border-hairline bg-muted/50" tone="canvas">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Critical Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.criticalInfo.map((info, i) => (
                    <li
                      className="flex items-start gap-2 text-sm text-foreground"
                      key={i}
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>{info}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty initial state */}
      {!(summary || loading || error) && (
        <Card tone="canvas">
          <CardContent className="flex flex-col items-center gap-2 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm font-medium">No summary generated</p>
            <p className="text-sm text-muted-foreground">
              Enter an event ID and click &quot;Generate Summary&quot; to create
              an AI-powered event summary.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AiClient() {
  return (
    <Tabs className="w-full" defaultValue="suggestions">
      <TabsList>
        <TabsTrigger className="gap-1.5" value="suggestions">
          <Lightbulb className="h-3.5 w-3.5" />
          AI Suggestions
        </TabsTrigger>
        <TabsTrigger className="gap-1.5" value="summaries">
          <FileText className="h-3.5 w-3.5" />
          Event Summaries
        </TabsTrigger>
        <TabsTrigger className="gap-1.5" value="bulk-tasks">
          <ListChecks className="h-3.5 w-3.5" />
          Task Generator
        </TabsTrigger>
      </TabsList>

      <TabsContent className="mt-6" value="suggestions">
        <SuggestionsTab />
      </TabsContent>

      <TabsContent className="mt-6" value="summaries">
        <EventSummariesTab />
      </TabsContent>

      <TabsContent className="mt-6" value="bulk-tasks">
        <BulkTaskGeneratorTab />
      </TabsContent>
    </Tabs>
  );
}
