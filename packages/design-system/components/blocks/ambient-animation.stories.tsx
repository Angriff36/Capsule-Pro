/**
 * AmbientAnimation Stories
 *
 * Stories for the ambient animation component used in empty states.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { AmbientAnimation } from "./ambient-animation";
import {
  EmptyListState,
  NoDataState,
  NoEventsState,
} from "./illustrated-empty-states";

const meta: Meta<typeof AmbientAnimation> = {
  title: "Blocks/AmbientAnimation",
  component: AmbientAnimation,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["particles", "waves", "pulse"],
    },
    intensity: {
      control: { type: "range", min: 0, max: 1, step: 0.1 },
    },
    isVisible: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof AmbientAnimation>;

/**
 * Default particle animation
 */
export const Particles: Story = {
  args: {
    isVisible: true,
    variant: "particles",
    intensity: 0.6,
    children: (
      <div className="w-96 p-8 text-center">
        <h3 className="text-lg font-medium">Empty State</h3>
        <p className="text-muted-foreground text-sm">
          This empty state has a subtle particle animation.
        </p>
      </div>
    ),
  },
};

/**
 * Wave animation variant
 */
export const Waves: Story = {
  args: {
    isVisible: true,
    variant: "waves",
    intensity: 0.6,
    children: (
      <div className="w-96 p-8 text-center">
        <h3 className="text-lg font-medium">Empty State</h3>
        <p className="text-muted-foreground text-sm">
          This empty state has a gentle wave animation.
        </p>
      </div>
    ),
  },
};

/**
 * Pulse animation variant
 */
export const Pulse: Story = {
  args: {
    isVisible: true,
    variant: "pulse",
    intensity: 0.6,
    children: (
      <div className="w-96 p-8 text-center">
        <h3 className="text-lg font-medium">Empty State</h3>
        <p className="text-muted-foreground text-sm">
          This empty state has a subtle pulse animation.
        </p>
      </div>
    ),
  },
};

/**
 * High intensity animation
 */
export const HighIntensity: Story = {
  args: {
    isVisible: true,
    variant: "particles",
    intensity: 1,
    children: (
      <div className="w-96 p-8 text-center">
        <h3 className="text-lg font-medium">Empty State</h3>
        <p className="text-muted-foreground text-sm">
          This empty state has a more visible animation.
        </p>
      </div>
    ),
  },
};

/**
 * Low intensity animation (more subtle)
 */
export const LowIntensity: Story = {
  args: {
    isVisible: true,
    variant: "particles",
    intensity: 0.2,
    children: (
      <div className="w-96 p-8 text-center">
        <h3 className="text-lg font-medium">Empty State</h3>
        <p className="text-muted-foreground text-sm">
          This empty state has a very subtle animation.
        </p>
      </div>
    ),
  },
};

/**
 * Hidden animation (for transition testing)
 */
export const Hidden: Story = {
  args: {
    isVisible: false,
    variant: "particles",
    intensity: 0.6,
    children: (
      <div className="w-96 p-8 text-center">
        <h3 className="text-lg font-medium">Empty State</h3>
        <p className="text-muted-foreground text-sm">
          The animation is hidden but content is still visible.
        </p>
      </div>
    ),
  },
};

/**
 * With EmptyListState component
 */
export const WithEmptyListState: Story = {
  args: {
    isVisible: true,
    variant: "particles",
    intensity: 0.5,
    children: (
      <EmptyListState
        enableAmbientAnimation={false}
        itemName="tasks"
        onCreate={() => console.log("Create task")}
      />
    ),
  },
};

/**
 * With NoDataState component (analytics dashboard style)
 */
export const WithNoDataState: Story = {
  args: {
    isVisible: true,
    variant: "particles",
    intensity: 0.4,
    children: (
      <NoDataState
        dataDescription="analytics"
        description="No analytics data available for this period."
        enableAmbientAnimation={false}
      />
    ),
  },
};
