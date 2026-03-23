"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Users, 
  MapPin, 
  UtensilsCrossed, 
  Users2, 
  ClipboardList, 
  FileText,
  DollarSign,
  Loader2
} from "lucide-react";
import { cn } from "@repo/design-system/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Badge } from "@repo/design-system/components/ui/badge";
import Link from "next/link";

export interface EventSetupChecklistProps {
  eventId: string;
  eventSlug?: string;
  hasClient: boolean;
  hasVenue: boolean;
  hasMenu: boolean;
  hasStaff: boolean;
  hasPrepList: boolean;
  hasContract: boolean;
  hasBudget: boolean;
  eventDate?: Date | null;
  eventStatus?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  icon: React.ReactNode;
  required: boolean;
  priority: "high" | "medium" | "low";
}

export function EventSetupChecklist({
  eventId,
  eventSlug,
  hasClient,
  hasVenue,
  hasMenu,
  hasStaff,
  hasPrepList,
  hasContract,
  hasBudget,
  eventDate,
  eventStatus,
}: EventSetupChecklistProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const items: ChecklistItem[] = useMemo(() => [
    {
      id: "client",
      label: "Client Assigned",
      description: "Link a client to this event for billing and communication",
      completed: hasClient,
      href: `/events/${eventSlug || eventId}?tab=details`,
      icon: <Users className="h-4 w-4" />,
      required: true,
      priority: "high",
    },
    {
      id: "venue",
      label: "Venue Selected",
      description: "Choose the event location and setup details",
      completed: hasVenue,
      href: `/events/${eventSlug || eventId}?tab=details`,
      icon: <MapPin className="h-4 w-4" />,
      required: true,
      priority: "high",
    },
    {
      id: "menu",
      label: "Menu Configured",
      description: "Add dishes and recipes for the event",
      completed: hasMenu,
      href: `/events/${eventSlug || eventId}?tab=menu`,
      icon: <UtensilsCrossed className="h-4 w-4" />,
      required: true,
      priority: "high",
    },
    {
      id: "staff",
      label: "Staff Assigned",
      description: "Assign team members and roles for the event",
      completed: hasStaff,
      href: `/events/${eventSlug || eventId}?tab=staff`,
      icon: <Users2 className="h-4 w-4" />,
      required: true,
      priority: "medium",
    },
    {
      id: "prep-list",
      label: "Prep List Generated",
      description: "Generate preparation tasks from the menu",
      completed: hasPrepList,
      href: `/events/${eventSlug || eventId}?tab=operations`,
      icon: <ClipboardList className="h-4 w-4" />,
      required: false,
      priority: "medium",
    },
    {
      id: "contract",
      label: "Contract Created",
      description: "Create and send contract for client signature",
      completed: hasContract,
      href: `/events/${eventSlug || eventId}?tab=contracts`,
      icon: <FileText className="h-4 w-4" />,
      required: false,
      priority: "medium",
    },
    {
      id: "budget",
      label: "Budget Approved",
      description: "Set up event budget and track costs",
      completed: hasBudget,
      href: `/events/${eventSlug || eventId}?tab=budget`,
      icon: <DollarSign className="h-4 w-4" />,
      required: false,
      priority: "low",
    },
  ], [eventId, eventSlug, hasClient, hasVenue, hasMenu, hasStaff, hasPrepList, hasContract, hasBudget]);

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const requiredItems = items.filter(i => i.required);
  const requiredComplete = requiredItems.filter(i => i.completed).length;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500";
      case "medium": return "text-amber-500";
      case "low": return "text-green-500";
      default: return "text-muted-foreground";
    }
  };

  const getStatusBadge = () => {
    if (requiredComplete === requiredItems.length) {
      return <Badge variant="default" className="bg-green-500">Ready for Event</Badge>;
    }
    if (progress > 50) {
      return <Badge variant="secondary">In Progress</Badge>;
    }
    return <Badge variant="outline">Setup Required</Badge>;
  };

  const getDaysUntilEvent = () => {
    if (!eventDate) return null;
    const now = new Date();
    const event = new Date(eventDate);
    const diffTime = event.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilEvent();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Event Setup Progress</CardTitle>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Progress value={animatedProgress} className="h-2 flex-1" />
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
        {daysUntil !== null && (
          <p className={cn(
            "text-sm mt-1",
            daysUntil < 0 ? "text-red-500" : daysUntil < 3 ? "text-amber-500" : "text-muted-foreground"
          )}>
            {daysUntil < 0 
              ? `${Math.abs(daysUntil)} days past event date`
              : daysUntil === 0 
                ? "Event is today"
                : `${daysUntil} days until event`
            }
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 p-2 rounded-md transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                item.completed && "opacity-75"
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Circle className={cn("h-5 w-5 shrink-0", getPriorityColor(item.priority))} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    !item.completed && item.required && "text-foreground"
                  )}>
                    {item.label}
                  </span>
                  {item.required && !item.completed && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
              <div className={cn(
                "shrink-0",
                item.completed ? "text-green-500" : "text-muted-foreground"
              )}>
                {item.icon}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for sidebar/quick view
export function EventSetupChecklistCompact({
  eventId,
  eventSlug,
  hasClient,
  hasVenue,
  hasMenu,
  hasStaff,
  hasPrepList,
}: Omit<EventSetupChecklistProps, 'hasContract' | 'hasBudget' | 'eventDate' | 'eventStatus'>) {
  const items = [
    { id: "client", completed: hasClient },
    { id: "venue", completed: hasVenue },
    { id: "menu", completed: hasMenu },
    { id: "staff", completed: hasStaff },
    { id: "prep", completed: hasPrepList },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="flex items-center gap-2">
      <Progress value={progress} className="h-1.5 w-20" />
      <span className="text-xs text-muted-foreground">{completedCount}/{items.length}</span>
    </div>
  );
}
