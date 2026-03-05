"use client";

import { OnboardingWizard } from "@repo/design-system/components/blocks/onboarding-wizard";
import {
  Calendar,
  ClipboardList,
  FileText,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";

const eventsOnboardingSteps = [
  {
    id: "welcome",
    title: "Welcome to Events",
    description:
      "Events are the heart of your operations. Track catering jobs, manage timelines, and coordinate with your team all in one place.",
    icon: <Calendar className="size-8" />,
  },
  {
    id: "create-event",
    title: "Create Your First Event",
    description:
      "Start by adding basic details like the event date, guest count, and venue. This information helps you plan resources and timelines.",
    icon: <Users className="size-8" />,
    actionLabel: "Create event",
    actionHref: "/events/new",
  },
  {
    id: "add-details",
    title: "Build Your Menu",
    description:
      "Add dishes from your recipe library, create custom items, and calculate costs. Your menus automatically sync with inventory and production.",
    icon: <UtensilsCrossed className="size-8" />,
    actionLabel: "Explore recipes",
    actionHref: "/kitchen/recipes",
  },
  {
    id: "coordinate",
    title: "Coordinate with Your Team",
    description:
      "Assign tasks, track progress, and use Battle Boards to visualize operations. Your team stays aligned and informed.",
    icon: <ClipboardList className="size-8" />,
    actionLabel: "Go to Battle Boards",
    actionHref: "/events/battle-boards",
  },
  {
    id: "reports",
    title: "Track Your Performance",
    description:
      "Use reports and analytics to understand your business metrics, profitability, and operational efficiency.",
    icon: <FileText className="size-8" />,
    actionLabel: "View reports",
    actionHref: "/events/reports",
  },
];

interface EventsOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EventsOnboardingWizard({
  isOpen,
  onClose,
}: EventsOnboardingWizardProps) {
  const [startStep, setStartStep] = useState(0);

  const handleClose = () => {
    onClose();
    // Reset to first step when wizard is closed
    setTimeout(() => setStartStep(0), 300);
  };

  return (
    <OnboardingWizard
      isOpen={isOpen}
      onClose={handleClose}
      showProgress
      showSkip
      startStep={startStep}
      steps={eventsOnboardingSteps}
    />
  );
}

// Hook to manage wizard state
export function useEventsOnboarding() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenWizard, setHasSeenWizard] = useState(false);

  const openWizard = () => setIsOpen(true);
  const closeWizard = () => setIsOpen(false);

  return {
    isOpen,
    openWizard,
    closeWizard,
    hasSeenWizard,
    setHasSeenWizard,
  };
}
