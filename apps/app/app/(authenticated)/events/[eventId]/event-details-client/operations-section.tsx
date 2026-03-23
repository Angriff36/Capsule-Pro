"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  ClipboardListIcon,
  ListChecksIcon,
  SwordsIcon,
  UsersIcon,
  ChefHatIcon,
  WineIcon,
  PackageIcon,
  PlusIcon,
  CheckIcon,
} from "lucide-react";
import Link from "next/link";
import { PrepTasksSection } from "../event-details-sections";
import type { PrepTaskSummaryClient } from "../prep-task-contract";

interface TemplateStaffing {
  servers: number;
  bartenders: number;
  chefs: number;
  setupCrew: number;
}

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
  onGeneratePrepList?: () => void;
  isGeneratingPrepList?: boolean;
  templateName?: string | null;
  templateStaffing?: TemplateStaffing | null;
  currentStaffCount?: number;
}

export function OperationsSection({
  eventId,
  prepTasks,
  taskSummary,
  onOpenGenerateModal,
  onGeneratePrepList,
  isGeneratingPrepList = false,
  templateName,
  templateStaffing,
  currentStaffCount = 0,
}: OperationsSectionProps) {
  // Calculate total suggested staff
  const totalSuggestedStaff = templateStaffing
    ? templateStaffing.servers +
      templateStaffing.bartenders +
      templateStaffing.chefs +
      templateStaffing.setupCrew
    : 0;

  // Check if staffing matches template
  const staffingMatches =
    templateStaffing && currentStaffCount === totalSuggestedStaff;

  return (
    <section className="space-y-4">
      {/* Template Staffing Suggestions */}
      {templateStaffing && templateName && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Suggested Staffing from {templateName}
                </CardTitle>
                <CardDescription>
                  Recommended staff levels based on event template
                </CardDescription>
              </div>
              {staffingMatches ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Staffed
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {currentStaffCount}/{totalSuggestedStaff} assigned
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Servers</span>
                  </div>
                  <p className="text-2xl font-semibold">
                    {templateStaffing.servers}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <WineIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Bartenders</span>
                  </div>
                  <p className="text-2xl font-semibold">
                    {templateStaffing.bartenders}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ChefHatIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Chefs</span>
                  </div>
                  <p className="text-2xl font-semibold">
                    {templateStaffing.chefs}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <PackageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Setup Crew</span>
                  </div>
                  <p className="text-2xl font-semibold">
                    {templateStaffing.setupCrew}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Total suggested: {totalSuggestedStaff} staff members</span>
              <span className="text-muted-foreground/50">•</span>
              <span>Currently assigned: {currentStaffCount}</span>
            </div>
          </CardContent>
        </Card>
      )}

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
                <p className="font-semibold text-lg">
                  {taskSummary.in_progress}
                </p>
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
            {onGeneratePrepList && (
              <Button
                variant="outline"
                onClick={onGeneratePrepList}
                disabled={isGeneratingPrepList}
              >
                <ListChecksIcon className="mr-2 size-4" />
                {isGeneratingPrepList ? "Generating..." : "Generate prep list"}
              </Button>
            )}
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
