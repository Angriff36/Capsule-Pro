import type { Meta, StoryObj } from "@storybook/react";
import { EntityDetailsSheetBlock } from "./entity-details-sheet-block";

const meta = {
  title: "Blocks/EntityDetailsSheetBlock",
  component: EntityDetailsSheetBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof EntityDetailsSheetBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
