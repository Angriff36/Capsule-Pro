"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Mail,
  RefreshCw,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  automatedFollowupComplete,
  automatedFollowupGenerate,
  automatedFollowupSkip,
  listAutomatedFollowups,
} from "@/app/lib/manifest-client.generated";

interface Followup {
  assigned_to: string | null;
  completed_at: string | null;
  description: string;
  due_date: string | null;
  event_name: string;
  id: string;
  status: string;
  task_type: string;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  communication: <Mail className="h-4 w-4" />,
  feedback: <FileText className="h-4 w-4" />,
  billing: <DollarSign className="h-4 w-4" />,
  administrative: <FileText className="h-4 w-4" />,
  sales: <Sparkles className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  completed: "bg-green-500",
  skipped: "bg-gray-500",
  overdue: "bg-red-500",
};

export default function EventFollowUpsPage() {
  const params = useParams();
  const eventId = (params?.eventId ?? "") as string;

  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    fetchFollowups();
  }, [eventId]);

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const result = await listAutomatedFollowups({ eventId });
      setFollowups(result.data as unknown as Followup[]);
    } catch (e) {
      console.error("Failed to fetch followups:", e);
    } finally {
      setLoading(false);
    }
  };

  const generateFollowups = async () => {
    setGenerating(true);
    try {
      await automatedFollowupGenerate({ id: eventId });
      fetchFollowups();
    } catch (e) {
      console.error("Failed to generate followups:", e);
    } finally {
      setGenerating(false);
    }
  };

  const completeFollowup = async (followupId: string) => {
    setActioning(followupId);
    try {
      await automatedFollowupComplete({ id: followupId });
      fetchFollowups();
    } catch (e) {
      console.error("Failed to complete followup:", e);
    } finally {
      setActioning(null);
    }
  };

  const skipFollowup = async (followupId: string) => {
    setActioning(followupId);
    try {
      await automatedFollowupSkip({
        id: followupId,
        reason: "Skipped by user",
      });
      fetchFollowups();
    } catch (e) {
      console.error("Failed to skip followup:", e);
    } finally {
      setActioning(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) {
      return "No due date";
    }
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status !== "pending") {
      return false;
    }
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-2xl">Event Follow-Ups</h2>
          <p className="text-muted-foreground">
            Automated follow-up tasks for client management
          </p>
        </div>
        <Button disabled={generating} onClick={generateFollowups}>
          {generating ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {generating ? "Generating..." : "Generate Follow-Ups"}
        </Button>
      </div>

      {loading ? (
        <Card tone="canvas">
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading follow-ups...
          </CardContent>
        </Card>
      ) : followups.length === 0 ? (
        <Card tone="canvas">
          <CardContent className="py-8 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">
              No follow-up tasks yet. Click "Generate Follow-Ups" to create
              automated post-event tasks.
            </p>
            <Button disabled={generating} onClick={generateFollowups}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Follow-Ups
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {followups.map((followup) => {
            const overdue = isOverdue(followup.due_date, followup.status);
            return (
              <Card
                className={overdue ? "border-red-500" : ""}
                key={followup.id}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {taskTypeIcons[followup.task_type] || (
                        <FileText className="h-4 w-4" />
                      )}
                      <CardTitle className="text-lg">
                        {followup.description}
                      </CardTitle>
                    </div>
                    <Badge
                      className={
                        overdue ? "bg-red-500" : statusColors[followup.status]
                      }
                    >
                      {overdue ? "overdue" : followup.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-muted-foreground text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(followup.due_date)}
                      </div>
                      <div className="capitalize">{followup.task_type}</div>
                    </div>
                    {followup.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          disabled={actioning === followup.id}
                          onClick={() => skipFollowup(followup.id)}
                          size="sm"
                          variant="outline"
                        >
                          <SkipForward className="mr-1 h-4 w-4" />
                          Skip
                        </Button>
                        <Button
                          disabled={actioning === followup.id}
                          onClick={() => completeFollowup(followup.id)}
                          size="sm"
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
