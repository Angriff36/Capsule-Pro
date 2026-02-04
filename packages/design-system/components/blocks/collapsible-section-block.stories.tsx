import type { Meta, StoryObj } from "@storybook/react";
import {
  DollarSignIcon,
  Lightbulb,
  PlusIcon,
  SparklesIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  CollapsibleSectionBlock,
  SectionHeaderBlock,
} from "./collapsible-section-block";

const meta: Meta<typeof CollapsibleSectionBlock> = {
  title: "Blocks/CollapsibleSectionBlock",
  component: CollapsibleSectionBlock,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    icon: { control: false },
    title: { control: "text" },
    subtitle: { control: "text" },
    iconColor: { control: "text" },
    defaultOpen: { control: "boolean" },
    triggerText: { control: "text" },
    showEmptyState: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof CollapsibleSectionBlock>;

/**
 * Default collapsible section with content
 */
export const WithContent: Story = {
  args: {
    icon: UtensilsIcon,
    title: "Menu / Dishes",
    subtitle: "5 dishes linked to this event",
    iconColor: "text-emerald-500",
    defaultOpen: true,
    triggerText: "View dishes",
    showEmptyState: false,
    headerActions: (
      <Button size="sm" variant="outline">
        <PlusIcon className="mr-2 size-3" />
        Add Dish
      </Button>
    ),
    children: (
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <div
            className="flex items-center justify-between rounded-lg border px-4 py-3"
            key={i}
          >
            <div className="flex flex-col">
              <span className="font-medium">Dish {i}</span>
              <span className="text-muted-foreground text-xs">
                Recipe: Recipe {i}
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              {50 * i} servings
            </span>
          </div>
        ))}
      </div>
    ),
  },
};

/**
 * Collapsible section with empty state
 */
export const EmptyState: Story = {
  render: () => (
    <CollapsibleSectionBlock
      defaultOpen
      emptyState={{
        icon: DollarSignIcon,
        title: "No budget created for this event",
        description: "Create a budget to track costs and manage event finances",
        actionLabel: "Create Budget",
        onAction: () => console.log("Create budget clicked"),
      }}
      icon={DollarSignIcon}
      iconColor="text-green-500"
      showEmptyState
      subtitle="No budget created yet"
      title="Event Budget"
      triggerText="View budget"
    />
  ),
};

/**
 * Collapsible section with no subtitle
 */
export const NoSubtitle: Story = {
  render: () => (
    <CollapsibleSectionBlock
      defaultOpen={false}
      emptyState={{
        title: "No guests added yet",
        description: "Add guests to manage RSVPs and dietary restrictions",
        actionLabel: "Add Guest",
        onAction: () => console.log("Add guest clicked"),
      }}
      icon={UsersIcon}
      iconColor="text-blue-500"
      showEmptyState
      title="Guest List"
      triggerText="View guests"
    />
  ),
};

/**
 * Multiple sections stacked together
 */
export const StackedSections: Story = {
  render: () => (
    <div className="w-[600px] space-y-4">
      <CollapsibleSectionBlock
        defaultOpen
        headerActions={
          <Button size="sm" variant="outline">
            <PlusIcon className="mr-2 size-3" />
            Add Dish
          </Button>
        }
        icon={UtensilsIcon}
        iconColor="text-emerald-500"
        subtitle="5 dishes linked to this event"
        title="Menu / Dishes"
        triggerText="View dishes"
      >
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div
              className="flex items-center justify-between rounded-lg border px-4 py-3"
              key={i}
            >
              <span className="font-medium">Dish {i}</span>
              <span className="text-muted-foreground text-xs">
                {50 * i} servings
              </span>
            </div>
          ))}
        </div>
      </CollapsibleSectionBlock>

      <CollapsibleSectionBlock
        emptyState={{
          icon: DollarSignIcon,
          title: "No budget created for this event",
          description:
            "Create a budget to track costs and manage event finances",
          actionLabel: "Create Budget",
        }}
        icon={DollarSignIcon}
        iconColor="text-green-500"
        showEmptyState
        subtitle="Draft - v1"
        title="Event Budget"
        triggerText="View budget"
      />

      <CollapsibleSectionBlock
        defaultOpen
        icon={UsersIcon}
        iconColor="text-purple-500"
        subtitle="3 tasks linked to this event"
        title="Prep Tasks"
        triggerText="View tasks"
      >
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div
              className="flex items-center justify-between rounded-lg border px-4 py-3"
              key={i}
            >
              <span className="font-medium">Task {i}</span>
              <Badge variant="outline">In Progress</Badge>
            </div>
          ))}
        </div>
      </CollapsibleSectionBlock>
    </div>
  ),
};

/**
 * SectionHeaderBlock - Non-collapsible header with actions
 */
export const SectionHeader: Story = {
  render: () => (
    <div className="w-[600px] space-y-6">
      <SectionHeaderBlock
        actions={
          <Button>
            <SparklesIcon className="mr-2 size-4" />
            Generate Tasks
          </Button>
        }
        icon={SparklesIcon}
        iconColor="text-purple-500"
        title="AI Task Assistant"
      />

      <SectionHeaderBlock
        actions={
          <Button variant="outline">
            <SparklesIcon className="mr-2 size-4" />
            Show Suggestions
          </Button>
        }
        badge="3"
        icon={Lightbulb}
        iconColor="text-amber-500"
        title="AI Suggestions"
      />

      <SectionHeaderBlock
        actions={
          <Button variant="outline">
            <SparklesIcon className="mr-2 size-4" />
            Generate Summary
          </Button>
        }
        icon={SparklesIcon}
        iconColor="text-primary"
        title="Executive Summary"
      />
    </div>
  ),
};

/**
 * With loading state
 */
export const WithLoadingState: Story = {
  args: {
    icon: UtensilsIcon,
    title: "Menu / Dishes",
    subtitle: "Loading dishes...",
    iconColor: "text-emerald-500",
    defaultOpen: true,
    triggerText: "View dishes",
    showEmptyState: false,
    children: (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
};

/**
 * With custom trigger text
 */
export const CustomTriggerText: Story = {
  args: {
    icon: DollarSignIcon,
    title: "Event Budget",
    subtitle: "Approved - v2",
    iconColor: "text-green-500",
    defaultOpen: false,
    triggerText: "View full budget",
    showEmptyState: false,
    children: (
      <div className="grid gap-4 md:grid-cols-4">
        {["Total Budgeted", "Total Actual", "Variance", ""].map((label, i) => (
          <div className="rounded-lg border p-4" key={i}>
            {label && (
              <div className="text-muted-foreground text-xs">{label}</div>
            )}
            {label && <div className="text-lg font-semibold">$1,000</div>}
            {!label && <Button className="w-full">View Full Budget</Button>}
          </div>
        ))}
      </div>
    ),
  },
};

/**
 * Empty state without icon
 */
export const EmptyStateNoIcon: Story = {
  render: () => (
    <CollapsibleSectionBlock
      defaultOpen
      emptyState={{
        title: "No prep tasks yet",
        description: "Generate a task breakdown or add tasks manually",
        actionLabel: "Generate with AI",
        onAction: () => console.log("Generate clicked"),
      }}
      icon={UsersIcon}
      iconColor="text-purple-500"
      showEmptyState
      subtitle="No tasks yet"
      title="Prep Tasks"
      triggerText="View tasks"
    />
  ),
};

/**
 * All icon color variations
 */
export const IconColorVariations: Story = {
  render: () => (
    <div className="w-[600px] space-y-4">
      <CollapsibleSectionBlock
        icon={UtensilsIcon}
        iconColor="text-emerald-500"
        subtitle="Using text-emerald-500"
        title="Emerald Icon"
        triggerText="View"
      >
        <div className="py-4 text-center text-muted-foreground text-sm">
          Content goes here
        </div>
      </CollapsibleSectionBlock>

      <CollapsibleSectionBlock
        icon={DollarSignIcon}
        iconColor="text-green-500"
        subtitle="Using text-green-500"
        title="Green Icon"
        triggerText="View"
      >
        <div className="py-4 text-center text-muted-foreground text-sm">
          Content goes here
        </div>
      </CollapsibleSectionBlock>

      <CollapsibleSectionBlock
        icon={SparklesIcon}
        iconColor="text-purple-500"
        subtitle="Using text-purple-500"
        title="Purple Icon"
        triggerText="View"
      >
        <div className="py-4 text-center text-muted-foreground text-sm">
          Content goes here
        </div>
      </CollapsibleSectionBlock>

      <CollapsibleSectionBlock
        icon={Lightbulb}
        iconColor="text-amber-500"
        subtitle="Using text-amber-500"
        title="Amber Icon"
        triggerText="View"
      >
        <div className="py-4 text-center text-muted-foreground text-sm">
          Content goes here
        </div>
      </CollapsibleSectionBlock>

      <CollapsibleSectionBlock
        icon={UsersIcon}
        iconColor="text-blue-500"
        subtitle="Using text-blue-500"
        title="Blue Icon"
        triggerText="View"
      >
        <div className="py-4 text-center text-muted-foreground text-sm">
          Content goes here
        </div>
      </CollapsibleSectionBlock>
    </div>
  ),
};

/**
 * Dynamic trigger text based on state
 *
 * This example demonstrates using a function for triggerText to support
 * dynamic text that changes based on component state (e.g., "View budget" vs "Create budget").
 */
export const DynamicTriggerText: Story = {
  render: () => {
    // Simulating a state variable that would change over time
    const hasBudget = true;

    return (
      <CollapsibleSectionBlock
        defaultOpen
        emptyState={{
          icon: DollarSignIcon,
          title: "No budget created for this event",
          description:
            "Create a budget to track costs and manage event finances",
          actionLabel: "Create Budget",
          onAction: () => console.log("Create budget clicked"),
        }}
        icon={DollarSignIcon}
        iconColor="text-green-500"
        showEmptyState={!hasBudget}
        subtitle={hasBudget ? "Approved - v2" : "No budget created yet"}
        title="Event Budget"
        triggerText={() => (hasBudget ? "View budget" : "Create budget")}
      >
        {hasBudget ? (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-xs">
                Total Budgeted
              </div>
              <div className="text-lg font-semibold">$5,000</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-xs">Total Actual</div>
              <div className="text-lg font-semibold">$4,500</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-xs">Variance</div>
              <div className="text-lg font-semibold text-green-600">+$500</div>
            </div>
            <div className="flex items-center">
              <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                View Full Budget
              </button>
            </div>
          </div>
        ) : null}
      </CollapsibleSectionBlock>
    );
  },
};
