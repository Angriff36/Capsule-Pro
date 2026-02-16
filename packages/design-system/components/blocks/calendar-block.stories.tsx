import type { Meta, StoryObj } from "@storybook/react";
import { CalendarBlock } from "./calendar-block";

const meta = {
  title: "Blocks/CalendarBlock",
  component: CalendarBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CalendarBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
