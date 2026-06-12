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
  CheckIcon,
  ChefHatIcon,
  ClipboardListIcon,
  ListChecksIcon,
  PackageIcon,
  SwordsIcon,
  UsersIcon,
  WineIcon,
} from "lucide-react";
import Link from "next/link";
import type { PrepListSummary } from "../event-details-sections";
import { PrepListsSection, PrepTasksSection } from "../event-details-sections";
import type { PrepTaskSummaryClient } from "../prep-task-contract";

interface TemplateStaffing {
  bartenders: number;
  chefs: number;
  servers: number;
  setupCrew: number;
}

interface OperationsSectionProps {
  battleBoardHref: string;
  currentStaffCount?: number;
  eventId: string;
  isGeneratingPrepList?: boolean;
  onGeneratePrepList?: () => void;
  onOpenGenerateModal: () => void;
  prepLists?: PrepListSummary[];
  prepTasks: PrepTaskSummaryClient[];
  taskSummary: {
    pending: number;
    in_progress: number;
    completed: number;
    canceled: number;
    other: number;
  };
  templateName?: string | null;
  templateStaffing?: TemplateStaffing | null;
}

export function OperationsSection({
  eventId,
  battleBoardHref,
  prepTasks,
  taskSummary,
  onOpenGenerateModal,
  onGeneratePrepList,
  isGeneratingPrepList = false,
  templateName,
  templateStaffing,
  currentStaffCount = 0,
  prepLists = [],
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
        <Card className="border-border/70" tone="canvas">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UsersIcon className="h-5 w-5" />
                  Suggested Staffing from {templateName}
                </CardTitle>
                <CardDescription>
                  Recommended staff levels based on event template
                </CardDescription>
              </div>
              {staffingMatches ? (
                <Badge
                  className="bg-muted/50 text-foreground"
                  variant="secondary"
                >
                  <CheckIcon className="mr-1 h-3 w-3" />
                  Staffed
                </Badge>
              ) : (
                <Badge
                  className="bg-muted/50 text-foreground"
                  variant="secondary"
                >
                  {currentStaffCount}/{totalSuggestedStaff} assigned
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-muted/30" tone="soft-stone">
                <CardContent className="pt-4 pb-3">
                  <div className="mb-1 flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      Servers
                    </span>
                  </div>
                  <p className="font-semibold text-2xl">
                    {templateStaffing.servers}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30" tone="soft-stone">
                <CardContent className="pt-4 pb-3">
                  <div className="mb-1 flex items-center gap-2">
                    <WineIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      Bartenders
                    </span>
                  </div>
                  <p className="font-semibold text-2xl">
                    {templateStaffing.bartenders}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30" tone="soft-stone">
                <CardContent className="pt-4 pb-3">
                  <div className="mb-1 flex items-center gap-2">
                    <ChefHatIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">Chefs</span>
                  </div>
                  <p className="font-semibold text-2xl">
                    {templateStaffing.chefs}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30" tone="soft-stone">
                <CardContent className="pt-4 pb-3">
                  <div className="mb-1 flex items-center gap-2">
                    <PackageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      Setup Crew
                    </span>
                  </div>
                  <p className="font-semibold text-2xl">
                    {templateStaffing.setupCrew}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
              <span>Total suggested: {totalSuggestedStaff} staff members</span>
              <span className="text-muted-foreground/50">•</span>
              <span>Currently assigned: {currentStaffCount}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70" tone="canvas">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Operations control</CardTitle>
          <CardDescription>
            Manage prep execution and open tactical timeline controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card tone="soft-stone">
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">Pending</p>
                <p className="font-semibold text-lg">{taskSummary.pending}</p>
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">In Progress</p>
                <p className="font-semibold text-lg">
                  {taskSummary.in_progress}
                </p>
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">Completed</p>
                <p className="font-semibold text-lg">{taskSummary.completed}</p>
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">Canceled</p>
                <p className="font-semibold text-lg">{taskSummary.canceled}</p>
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardContent className="pt-5">
                <p className="text-foreground/70 text-xs">Other</p>
                <p className="font-semibold text-lg">{taskSummary.other}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href={battleBoardHref}>
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
                disabled={isGeneratingPrepList}
                onClick={onGeneratePrepList}
                variant="outline"
              >
                <ListChecksIcon className="mr-2 size-4" />
                {isGeneratingPrepList ? "Generating..." : "Generate prep list"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PrepListsSection prepLists={prepLists} />

      <PrepTasksSection
        onOpenGenerateModal={onOpenGenerateModal}
        prepTasks={prepTasks}
      />
    </section>
  );
}
