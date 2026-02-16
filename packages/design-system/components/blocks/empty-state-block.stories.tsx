import type { Meta, StoryObj } from "@storybook/react";
import { EmptyStateBlock } from "./empty-state-block";

const meta = {
  title: "Blocks/EmptyStateBlock",
  component: EmptyStateBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof EmptyStateBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
