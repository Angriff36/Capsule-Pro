import type { Meta, StoryObj } from "@storybook/react";
import { DashboardHeaderBlock } from "./dashboard-header-block";

const meta = {
  title: "Blocks/DashboardHeaderBlock",
  component: DashboardHeaderBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DashboardHeaderBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
