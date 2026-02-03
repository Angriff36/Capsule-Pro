import type { Meta, StoryObj } from "@storybook/react";
import {
  UtensilsIcon,
  DollarSignIcon,
  PlusIcon,
  UsersIcon,
  SparklesIcon,
  Lightbulb,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
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
            key={i}
            className="flex items-center justify-between rounded-lg border px-4 py-3"
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
      icon={DollarSignIcon}
      title="Event Budget"
      subtitle="No budget created yet"
      iconColor="text-green-500"
      defaultOpen
      triggerText="View budget"
      showEmptyState
      emptyState={{
        icon: DollarSignIcon,
        title: "No budget created for this event",
        description: "Create a budget to track costs and manage event finances",
        actionLabel: "Create Budget",
        onAction: () => console.log("Create budget clicked"),
      }}
    />
  ),
};

/**
 * Collapsible section with no subtitle
 */
export const NoSubtitle: Story = {
  render: () => (
    <CollapsibleSectionBlock
      icon={UsersIcon}
      title="Guest List"
      iconColor="text-blue-500"
      defaultOpen={false}
      triggerText="View guests"
      showEmptyState
      emptyState={{
        title: "No guests added yet",
        description: "Add guests to manage RSVPs and dietary restrictions",
        actionLabel: "Add Guest",
        onAction: () => console.log("Add guest clicked"),
      }}
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
        icon={UtensilsIcon}
        title="Menu / Dishes"
        subtitle="5 dishes linked to this event"
        iconColor="text-emerald-500"
        defaultOpen
        triggerText="View dishes"
        headerActions={
          <Button size="sm" variant="outline">
            <PlusIcon className="mr-2 size-3" />
            Add Dish
          </Button>
        }
      >
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
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
        icon={DollarSignIcon}
        title="Event Budget"
        subtitle="Draft - v1"
        iconColor="text-green-500"
        triggerText="View budget"
        showEmptyState
        emptyState={{
          icon: DollarSignIcon,
          title: "No budget created for this event",
          description: "Create a budget to track costs and manage event finances",
          actionLabel: "Create Budget",
        }}
      />

      <CollapsibleSectionBlock
        icon={UsersIcon}
        title="Prep Tasks"
        subtitle="3 tasks linked to this event"
        iconColor="text-purple-500"
        defaultOpen
        triggerText="View tasks"
      >
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
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
        icon={SparklesIcon}
        title="AI Task Assistant"
        iconColor="text-purple-500"
        actions={
          <Button>
            <SparklesIcon className="mr-2 size-4" />
            Generate Tasks
          </Button>
        }
      />

      <SectionHeaderBlock
        icon={Lightbulb}
        title="AI Suggestions"
        iconColor="text-amber-500"
        badge="3"
        actions={
          <Button variant="outline">
            <SparklesIcon className="mr-2 size-4" />
            Show Suggestions
          </Button>
        }
      />

      <SectionHeaderBlock
        icon={SparklesIcon}
        title="Executive Summary"
        iconColor="text-primary"
        actions={
          <Button variant="outline">
            <SparklesIcon className="mr-2 size-4" />
            Generate Summary
          </Button>
        }
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
          <div key={i} className="rounded-lg border p-4">
            {label && <div className="text-muted-foreground text-xs">{label}</div>}
            {label && <div className="text-lg font-semibold">$1,000</div>}
            {!label && (
              <Button className="w-full">View Full Budget</Button>
            )}
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
      icon={UsersIcon}
      title="Prep Tasks"
      subtitle="No tasks yet"
      iconColor="text-purple-500"
      defaultOpen
      triggerText="View tasks"
      showEmptyState
      emptyState={{
        title: "No prep tasks yet",
        description: "Generate a task breakdown or add tasks manually",
        actionLabel: "Generate with AI",
        onAction: () => console.log("Generate clicked"),
      }}
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
        title="Emerald Icon"
        subtitle="Using text-emerald-500"
        iconColor="text-emerald-500"
        triggerText="View"
      >
        <div className="py-4 text-center text-muted-foreground text-sm">
          Content goes here
        </div>
      </CollapsibleSectionBlock>

      <CollapsibleSectionBlock
        icon={DollarSignIcon}
        title="Green Icon"
        subtitle="Using text-green-500"
        iconColor="text-green-500"
        triggerText="View"
      >
        <div className="py-4 text-center text-muted-foreground text-sm">
          Content goes here
        </div>
      </CollapsibleSectionBlock>

      <CollapsibleSectionBlock
        icon={SparklesIcon}
        title="Purple Icon"
        subtitle="Using text-purple-500"
        iconColor="text-purple-500"
        triggerText="View"
      >
        <div className="py-4 text-center text-muted-foreground text-sm">
          Content goes here
        </div>
      </CollapsibleSectionBlock>

      <CollapsibleSectionBlock
        icon={Lightbulb}
        title="Amber Icon"
        subtitle="Using text-amber-500"
        iconColor="text-amber-500"
        triggerText="View"
      >
        <div className="py-4 text-center text-muted-foreground text-sm">
          Content goes here
        </div>
      </CollapsibleSectionBlock>

      <CollapsibleSectionBlock
        icon={UsersIcon}
        title="Blue Icon"
        subtitle="Using text-blue-500"
        iconColor="text-blue-500"
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
        icon={DollarSignIcon}
        title="Event Budget"
        subtitle={hasBudget ? "Approved - v2" : "No budget created yet"}
        iconColor="text-green-500"
        defaultOpen
        triggerText={() => (hasBudget ? "View budget" : "Create budget")}
        showEmptyState={!hasBudget}
        emptyState={{
          icon: DollarSignIcon,
          title: "No budget created for this event",
          description: "Create a budget to track costs and manage event finances",
          actionLabel: "Create Budget",
          onAction: () => console.log("Create budget clicked"),
        }}
      >
        {hasBudget ? (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-xs">Total Budgeted</div>
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
