import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, Package, Users } from "lucide-react";
import {
  NoClientsState,
  NoEventsState,
  NoInventoryState,
} from "./illustrated-empty-states";
import { MicroTour, TOUR_CONFIGS, useMicroTourState } from "./micro-tour";

const meta: Meta<typeof MicroTour> = {
  title: "Blocks/MicroTour",
  component: MicroTour,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    tourId: { control: "text" },
    autoAdvanceInterval: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof MicroTour>;

// Basic tour example
export const Default: Story = {
  render: () => {
    const { isActive, handleComplete, handleDontShowAgain } =
      useMicroTourState("demo-tour");

    return (
      <div className="relative w-[800px] h-[600px] bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Page content behind the tour</p>
        <MicroTour
          isActive={isActive}
          onComplete={handleComplete}
          onDontShowAgain={handleDontShowAgain}
          steps={[
            {
              id: "step-1",
              title: "Welcome!",
              description:
                "This is a lightweight micro-tour that helps users understand new sections.",
            },
            {
              id: "step-2",
              title: "Non-Blocking",
              description:
                "Unlike modals, you can still interact with the page while the tour is visible.",
            },
            {
              id: "step-3",
              title: "Quick & Easy",
              description:
                "Tours are 2-4 steps and can be dismissed with 'Don't show again' forever.",
            },
          ]}
          tourId="demo-tour"
        />
      </div>
    );
  },
};

// Tour with icons
export const WithIcons: Story = {
  render: () => {
    const { isActive, handleComplete, handleDontShowAgain } =
      useMicroTourState("demo-icons-tour");

    return (
      <div className="relative w-[800px] h-[600px] bg-muted/30 rounded-lg flex items-center justify-center">
        <MicroTour
          isActive={isActive}
          onComplete={handleComplete}
          onDontShowAgain={handleDontShowAgain}
          steps={[
            {
              id: "calendar",
              title: "Events Calendar",
              description:
                "View and manage all your catering events from the calendar.",
              icon: <Calendar className="size-4 text-primary" />,
            },
            {
              id: "users",
              title: "Client Management",
              description:
                "Keep track of client contacts, preferences, and event history.",
              icon: <Users className="size-4 text-primary" />,
            },
            {
              id: "package",
              title: "Inventory Tracking",
              description:
                "Monitor stock levels and costs for all your ingredients.",
              icon: <Package className="size-4 text-primary" />,
            },
          ]}
          tourId="demo-icons-tour"
        />
      </div>
    );
  },
};

// Events empty state with tour
export const EventsEmptyStateWithTour: Story = {
  render: () => {
    const { isActive, handleComplete, handleDontShowAgain } = useMicroTourState(
      TOUR_CONFIGS.events.tourId
    );

    return (
      <div className="relative w-[800px] h-[600px] bg-background rounded-lg">
        <NoEventsState onCreateEvent={() => {}} />
        <MicroTour
          isActive={isActive}
          onComplete={handleComplete}
          onDontShowAgain={handleDontShowAgain}
          steps={[...TOUR_CONFIGS.events.steps]}
          tourId={TOUR_CONFIGS.events.tourId}
        />
      </div>
    );
  },
};

// Clients empty state with tour
export const ClientsEmptyStateWithTour: Story = {
  render: () => {
    const { isActive, handleComplete, handleDontShowAgain } = useMicroTourState(
      TOUR_CONFIGS.clients.tourId
    );

    return (
      <div className="relative w-[800px] h-[600px] bg-background rounded-lg">
        <NoClientsState onCreateClient={() => {}} />
        <MicroTour
          isActive={isActive}
          onComplete={handleComplete}
          onDontShowAgain={handleDontShowAgain}
          steps={[...TOUR_CONFIGS.clients.steps]}
          tourId={TOUR_CONFIGS.clients.tourId}
        />
      </div>
    );
  },
};

// Inventory empty state with tour
export const InventoryEmptyStateWithTour: Story = {
  render: () => {
    const { isActive, handleComplete, handleDontShowAgain } = useMicroTourState(
      TOUR_CONFIGS.inventory.tourId
    );

    return (
      <div className="relative w-[800px] h-[600px] bg-background rounded-lg">
        <NoInventoryState onAddItem={() => {}} />
        <MicroTour
          isActive={isActive}
          onComplete={handleComplete}
          onDontShowAgain={handleDontShowAgain}
          steps={[...TOUR_CONFIGS.inventory.steps]}
          tourId={TOUR_CONFIGS.inventory.tourId}
        />
      </div>
    );
  },
};

// Auto-advancing tour
export const AutoAdvance: Story = {
  render: () => {
    const { isActive, handleComplete, handleDontShowAgain } =
      useMicroTourState("demo-auto-advance");

    return (
      <div className="relative w-[800px] h-[600px] bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">
          This tour auto-advances every 3 seconds
        </p>
        <MicroTour
          autoAdvanceInterval={3000}
          isActive={isActive}
          onComplete={handleComplete}
          onDontShowAgain={handleDontShowAgain}
          steps={[
            {
              id: "auto-1",
              title: "Auto-Advance Demo",
              description:
                "This tour will automatically advance to the next step.",
            },
            {
              id: "auto-2",
              title: "Step 2",
              description:
                "You can also click Next or use arrow keys to navigate.",
            },
            {
              id: "auto-3",
              title: "Final Step",
              description: "Click 'Got it' to dismiss the tour.",
            },
          ]}
          tourId="demo-auto-advance"
        />
      </div>
    );
  },
};
