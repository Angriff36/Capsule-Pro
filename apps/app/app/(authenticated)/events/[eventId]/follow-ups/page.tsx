'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { 
  CheckCircle2, 
  SkipForward, 
  Calendar, 
  Mail, 
  FileText, 
  DollarSign,
  Sparkles,
  Clock,
  RefreshCw
} from 'lucide-react';

interface Followup {
  id: string;
  task_type: string;
  description: string;
  due_date: string | null;
  status: string;
  assigned_to: string | null;
  completed_at: string | null;
  event_name: string;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  communication: <Mail className="h-4 w-4" />,
  feedback: <FileText className="h-4 w-4" />,
  billing: <DollarSign className="h-4 w-4" />,
  administrative: <FileText className="h-4 w-4" />,
  sales: <Sparkles className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  completed: 'bg-green-500',
  skipped: 'bg-gray-500',
  overdue: 'bg-red-500',
};

export default function EventFollowUpsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  
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
      const res = await fetch(`/api/events/automated-followups/list?eventId=${eventId}`);
      const data = await res.json();
      setFollowups(data.followups || []);
    } catch (e) {
      console.error('Failed to fetch followups:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateFollowups = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/events/automated-followups/commands/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchFollowups();
      }
    } catch (e) {
      console.error('Failed to generate followups:', e);
    } finally {
      setGenerating(false);
    }
  };

  const completeFollowup = async (followupId: string) => {
    setActioning(followupId);
    try {
      const res = await fetch('/api/events/automated-followups/commands/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followupId }),
      });
      if (res.ok) {
        fetchFollowups();
      }
    } catch (e) {
      console.error('Failed to complete followup:', e);
    } finally {
      setActioning(null);
    }
  };

  const skipFollowup = async (followupId: string) => {
    setActioning(followupId);
    try {
      const res = await fetch('/api/events/automated-followups/commands/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followupId, reason: 'Skipped by user' }),
      });
      if (res.ok) {
        fetchFollowups();
      }
    } catch (e) {
      console.error('Failed to skip followup:', e);
    } finally {
      setActioning(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status !== 'pending') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Follow-Ups</h2>
          <p className="text-muted-foreground">
            Automated follow-up tasks for client management
          </p>
        </div>
        <Button onClick={generateFollowups} disabled={generating}>
          {generating ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {generating ? 'Generating...' : 'Generate Follow-Ups'}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading follow-ups...
          </CardContent>
        </Card>
      ) : followups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No follow-up tasks yet. Click "Generate Follow-Ups" to create 
              automated post-event tasks.
            </p>
            <Button onClick={generateFollowups} disabled={generating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Follow-Ups
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {followups.map((followup) => {
            const overdue = isOverdue(followup.due_date, followup.status);
            return (
              <Card key={followup.id} className={overdue ? 'border-red-500' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {taskTypeIcons[followup.task_type] || <FileText className="h-4 w-4" />}
                      <CardTitle className="text-lg">{followup.description}</CardTitle>
                    </div>
                    <Badge className={overdue ? 'bg-red-500' : statusColors[followup.status]}>
                      {overdue ? 'overdue' : followup.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(followup.due_date)}
                      </div>
                      <div className="capitalize">{followup.task_type}</div>
                    </div>
                    {followup.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => skipFollowup(followup.id)}
                          disabled={actioning === followup.id}
                        >
                          <SkipForward className="h-4 w-4 mr-1" />
                          Skip
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => completeFollowup(followup.id)}
                          disabled={actioning === followup.id}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
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
