"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { ClipboardListIcon, SwordsIcon } from "lucide-react";
import Link from "next/link";
import { PrepTasksSection } from "../event-details-sections";
import type { PrepTaskSummaryClient } from "../prep-task-contract";

interface OperationsSectionProps {
  eventId: string;
  prepTasks: PrepTaskSummaryClient[];
  taskSummary: {
    pending: number;
    in_progress: number;
    completed: number;
    canceled: number;
    other: number;
  };
  onOpenGenerateModal: () => void;
}

export function OperationsSection({
  eventId,
  prepTasks,
  taskSummary,
  onOpenGenerateModal,
}: OperationsSectionProps) {
  return (
    <section className="space-y-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Operations control</CardTitle>
          <CardDescription>
            Manage prep execution and open tactical timeline controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">Pending</p>
                <p className="font-semibold text-lg">{taskSummary.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">In Progress</p>
                <p className="font-semibold text-lg">{taskSummary.in_progress}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">Completed</p>
                <p className="font-semibold text-lg">{taskSummary.completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">Canceled</p>
                <p className="font-semibold text-lg">{taskSummary.canceled}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">Other</p>
                <p className="font-semibold text-lg">{taskSummary.other}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/events/${eventId}/battle-board`}>
                <SwordsIcon className="mr-2 size-4" />
                Open Battle Board
              </Link>
            </Button>
            <Button onClick={onOpenGenerateModal}>
              <ClipboardListIcon className="mr-2 size-4" />
              Generate task breakdown
            </Button>
          </div>
        </CardContent>
      </Card>

      <PrepTasksSection
        onOpenGenerateModal={onOpenGenerateModal}
        prepTasks={prepTasks}
      />
    </section>
  );
}
