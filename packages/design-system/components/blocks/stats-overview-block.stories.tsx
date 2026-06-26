// @boundaries-ignore automatically added by `turbo boundaries --ignore=all`
"@storybook/react";
import { StatsOverviewBlock } from "./stats-overview-block";

const meta = {
  title: "Blocks/StatsOverviewBlock",
  component: StatsOverviewBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof StatsOverviewBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
