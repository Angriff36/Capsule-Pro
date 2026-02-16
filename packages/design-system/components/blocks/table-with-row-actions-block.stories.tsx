import type { Meta, StoryObj } from "@storybook/react";
import { TableWithRowActionsBlock } from "./table-with-row-actions-block";

const meta = {
  title: "Blocks/TableWithRowActionsBlock",
  component: TableWithRowActionsBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof TableWithRowActionsBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
