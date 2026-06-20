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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle,
  Clock,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { apiFetch } from "@/app/lib/api";
import * as routes from "@/app/lib/routes";

interface Draft {
  id: string;
  status: string;
  clientName: string | null;
  eventType: string | null;
  eventDate: string | null;
  guestCount: number | null;
  overallConfidence: number;
  proposalId: string | null;
  createdAt: string;
  updatedAt: string;
  sessionStatus: string | null;
  sessionStartedAt: string | null;
}

interface CallPlannerClientProps {
  initialDrafts: Draft[];
}

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  review: "secondary",
  converted: "default",
  expired: "destructive",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  review: "In Review",
  converted: "Converted",
  expired: "Expired",
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatEventType = (type: string | null) => {
  if (!type) return "Event";
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return "text-green-600";
  if (confidence >= 0.6) return "text-yellow-600";
  return "text-red-600";
};

const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.6) return "Medium";
  return "Low";
};

export function CallPlannerClient({
  initialDrafts,
}: CallPlannerClientProps) {
  const posthog = usePostHog();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts);
  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    posthog?.capture("call_planner:viewed", {
      draft_count: drafts.length,
    });
  }, [posthog, drafts.length]);

  const handleUpload = useCallback(async () => {
    if (!transcript.trim()) {
      toast.error("Please enter a transcript");
      return;
    }

    setIsUploading(true);
    try {
      const response = await apiFetch(routes.callPlannerTranscript(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, sourceType: "manual" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process transcript");
      }

      const data = await response.json();

      toast.success("Transcript processed successfully", {
        description: "Draft created with extracted details",
      });

      setUploadDialogOpen(false);
      setTranscript("");

      // Navigate to the draft detail page
      router.push(`/call-planner/drafts/${data.draft.id}`);
    } catch (error) {
      toast.error("Failed to process transcript", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsUploading(false);
    }
  }, [transcript, router]);

  const handleDeleteDraft = useCallback(
    async (draftId: string) => {
      try {
        const response = await apiFetch(routes.callPlannerDraft(draftId), {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete draft");

        toast.success("Draft deleted");

        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      } catch {
        toast.error("Failed to delete draft");
      }
    },
    []
  );

  const handleRefresh = useCallback(async () => {
    try {
      const response = await apiFetch(routes.callPlannerDrafts());
      if (!response.ok) throw new Error("Failed to refresh drafts");

      const data = await response.json();
      setDrafts(
        data.drafts.map((d: Draft) => ({
          ...d,
          eventDate: d.eventDate ? new Date(d.eventDate).toISOString() : null,
          createdAt: new Date(d.createdAt).toISOString(),
          updatedAt: new Date(d.updatedAt).toISOString(),
          sessionStartedAt: d.sessionStartedAt
            ? new Date(d.sessionStartedAt).toISOString()
            : null,
        }))
      );
    } catch {
      toast.error("Failed to refresh drafts");
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Call Planner</h1>
          <p className="text-muted-foreground">
            Transform call transcripts into event proposals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                New from Transcript
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Paste Call Transcript</DialogTitle>
                <DialogDescription>
                  Paste your call transcript below. AI will extract event details
                  and create a draft proposal.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="transcript">Transcript</Label>
                  <Textarea
                    id="transcript"
                    placeholder="Paste your call transcript here..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={12}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    The transcript will be analyzed to extract client name, event
                    type, date, guest count, venue preferences, budget, and
                    more.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    setTranscript("");
                  }}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Process Transcript
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>AI-Powered Event Extraction</AlertTitle>
        <AlertDescription>
          Paste your call transcript to automatically extract event details,
          client preferences, and generate draft proposals. The system uses
          rule-based extraction with confidence tracking for reliability.
        </AlertDescription>
      </Alert>

      {/* Drafts List */}
      {drafts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No drafts yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Start by pasting a call transcript to create your first draft
            </p>
            <Button
              className="mt-4"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Create from Transcript
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Drafts</h2>
          <div className="grid gap-4">
            {drafts.map((draft) => (
              <Card key={draft.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">
                          {draft.clientName || "Untitled Event"}
                        </CardTitle>
                        <Badge variant={statusColors[draft.status] || "default"}>
                          {statusLabels[draft.status] || draft.status}
                        </Badge>
                        {draft.proposalId && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Proposal
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span>{formatEventType(draft.eventType)}</span>
                        {draft.eventDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(draft.eventDate).toLocaleDateString()}
                          </span>
                        )}
                        {draft.guestCount && (
                          <span>{draft.guestCount} guests</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/call-planner/drafts/${draft.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {draft.proposalId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/call-planner/proposals/${draft.proposalId}`
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this draft?")) {
                            handleDeleteDraft(draft.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        Created {formatDate(draft.createdAt)}
                      </span>
                      <span
                        className={`font-medium ${getConfidenceColor(
                          draft.overallConfidence
                        )}`}
                      >
                        {getConfidenceLabel(draft.overallConfidence)} confidence
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/call-planner/drafts/${draft.id}`)}
                    >
                      Review & Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
