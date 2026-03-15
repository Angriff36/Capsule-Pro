import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, ClipboardList, Users, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import {
  InlineWizard,
  OnboardingWizard,
  WizardTriggerButton,
} from "./onboarding-wizard";

const meta: Meta<typeof OnboardingWizard> = {
  title: "Blocks/OnboardingWizard",
  component: OnboardingWizard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof OnboardingWizard>;

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
];

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <WizardTriggerButton onClick={() => setIsOpen(true)} />
        <OnboardingWizard
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          steps={eventsOnboardingSteps}
        />
      </>
    );
  },
};

export const WithoutProgress: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <WizardTriggerButton onClick={() => setIsOpen(true)} />
        <OnboardingWizard
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          showProgress={false}
          steps={eventsOnboardingSteps}
        />
      </>
    );
  },
};

export const Inline: Story = {
  render: () => {
    return <InlineWizard steps={eventsOnboardingSteps} />;
  },
};

export const Minimal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    const minimalSteps = [
      {
        id: "step-1",
        title: "Get Started",
        description: "Create your first item to begin using this feature.",
        icon: <Calendar className="size-8" />,
      },
      {
        id: "step-2",
        title: "Add Details",
        description: "Fill in the important details.",
        actionLabel: "Continue",
      },
    ];

    return (
      <>
        <WizardTriggerButton onClick={() => setIsOpen(true)} />
        <OnboardingWizard
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          steps={minimalSteps}
        />
      </>
    );
  },
};
