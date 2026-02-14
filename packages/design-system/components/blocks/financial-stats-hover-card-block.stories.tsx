import type { Meta, StoryObj } from "@storybook/react";
import { FinancialStatsHoverCardBlock } from "./financial-stats-hover-card-block";

const meta = {
  title: "Blocks/FinancialStatsHoverCardBlock",
  component: FinancialStatsHoverCardBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FinancialStatsHoverCardBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
