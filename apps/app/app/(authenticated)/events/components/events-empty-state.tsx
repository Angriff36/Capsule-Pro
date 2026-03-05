"use client";

import type { UserRole } from "@repo/design-system/components/blocks/illustrated-empty-states";
import { InlineWizard } from "@repo/design-system/components/blocks/onboarding-wizard";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useEventsWizard } from "./events-wizard-context";

const wizardSteps = [
  {
    id: "create-event",
    title: "Create Your First Event",
    description:
      "Start by adding basic details like the event date, guest count, and venue. This information helps you plan resources and timelines.",
    icon: <Sparkles className="size-8" />,
    actionLabel: "Create event",
    actionHref: "/events/new",
  },
  {
    id: "explore-features",
    title: "Explore Key Features",
    description:
      "Discover menu planning, Battle Boards for team coordination, and detailed reporting to manage your events efficiently.",
    icon: <Sparkles className="size-8" />,
    actionLabel: "Learn more",
    actionHref: "/events/reports",
  },
];

/**
 * Determines if a role can create content
 */
function canRoleCreate(role: UserRole | undefined): boolean {
  if (!role) return false;
  const viewerRoles: UserRole[] = ["staff"];
  return !viewerRoles.includes(role);
}

interface EventsEmptyStateProps {
  showWizard?: boolean;
  /** User role for role-aware messaging */
  userRole?: UserRole;
}

export function EventsEmptyState({
  showWizard = true,
  userRole,
}: EventsEmptyStateProps) {
  const [useWizard, setUseWizard] = useState(showWizard);
  const { openWizard } = useEventsWizard();
  const canCreate = canRoleCreate(userRole);

  // Viewer-specific empty state
  if (!canCreate) {
    return (
      <div className="w-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles />
            </EmptyMedia>
            <EmptyTitle>No events yet</EmptyTitle>
            <EmptyDescription>
              Events will appear here once an admin schedules them. Contact your
              administrator if you need to book an event.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="size-4" />
              <span>Contact an admin to create events</span>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (useWizard) {
    return (
      <div className="w-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles />
            </EmptyMedia>
            <EmptyTitle>No events yet</EmptyTitle>
            <EmptyDescription>
              Let's get you set up with your first event. Choose how you'd like
              to proceed:
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={openWizard} size="default">
                <Sparkles className="size-4" />
                Start guided tour
              </Button>
              <Button
                asChild
                onClick={() => setUseWizard(false)}
                size="default"
                variant="outline"
              >
                <Link href="/events/new">Create event directly</Link>
              </Button>
            </div>
            <button
              className="text-muted-foreground text-xs hover:text-foreground transition-colors"
              onClick={() => setUseWizard(false)}
              type="button"
            >
              Switch to inline wizard
            </button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No events yet</EmptyTitle>
          <EmptyDescription>
            Follow these steps to create your first event:
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <InlineWizard steps={wizardSteps} />
          <button
            className="text-muted-foreground text-xs hover:text-foreground transition-colors"
            onClick={() => setUseWizard(true)}
            type="button"
          >
            Back to guided tour
          </button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
