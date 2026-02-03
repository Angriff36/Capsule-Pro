import type { Meta, StoryObj } from "@storybook/react";
import {
  CalendarIcon,
  DollarSignIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react";
import { ClientQuickStatsBlock } from "./client-quick-stats-block";

const meta = {
  title: "Blocks/ClientQuickStatsBlock",
  component: ClientQuickStatsBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ClientQuickStatsBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    stats: [
      { label: "Total Events", value: 42, icon: CalendarIcon },
      { label: "Interactions", value: 128, icon: MessageSquareIcon },
      { label: "Total Revenue", value: "$48,500", icon: DollarSignIcon },
      { label: "Contacts", value: 5, icon: UsersIcon },
    ],
  },
};

export const WithoutIcons: Story = {
  args: {
    stats: [
      { label: "Total Events", value: 42 },
      { label: "Interactions", value: 128 },
      { label: "Total Revenue", value: "$48,500" },
      { label: "Contacts", value: 5 },
    ],
  },
};

export const WithNumbers: Story = {
  args: {
    stats: [
      { label: "Total Events", value: 42 },
      { label: "Interactions", value: 128 },
      { label: "Total Revenue", value: 48500 },
      { label: "Contacts", value: 5 },
    ],
  },
};

export const FewerStats: Story = {
  args: {
    stats: [
      { label: "Total Events", value: 42, icon: CalendarIcon },
      { label: "Total Revenue", value: "$48,500", icon: DollarSignIcon },
    ],
  },
};

export const EmptyValues: Story = {
  args: {
    stats: [
      { label: "Total Events", value: 0, icon: CalendarIcon },
      { label: "Interactions", value: 0, icon: MessageSquareIcon },
      { label: "Total Revenue", value: "$0", icon: DollarSignIcon },
      { label: "Contacts", value: 0, icon: UsersIcon },
    ],
  },
};
