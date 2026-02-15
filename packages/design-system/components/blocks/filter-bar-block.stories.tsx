import type { Meta, StoryObj } from "@storybook/react";
import { FilterBarBlock } from "./filter-bar-block";

const meta = {
  title: "Blocks/FilterBarBlock",
  component: FilterBarBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FilterBarBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
