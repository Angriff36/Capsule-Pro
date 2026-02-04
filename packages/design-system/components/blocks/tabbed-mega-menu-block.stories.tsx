import type { Meta, StoryObj } from "@storybook/react";
import {
  BriefcaseIcon,
  CalendarIcon,
  ClipboardIcon,
  CloudIcon,
  LayoutGridIcon,
  ListTodoIcon,
  NotebookPenIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { TabbedMegaMenuBlock } from "./tabbed-mega-menu-block";

const meta = {
  title: "Blocks/TabbedMegaMenuBlock",
  component: TabbedMegaMenuBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    tabs: { control: false },
  },
} satisfies Meta<typeof TabbedMegaMenuBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AppModules: Story = {
  args: {
    tabs: [
      {
        value: "events",
        label: "Events",
        items: [
          {
            icon: CalendarIcon,
            title: "Events Overview",
            description: "Quick snapshots and statuses",
          },
          {
            icon: LayoutGridIcon,
            title: "Run of Show",
            description: "Timeline, stations, and flow",
          },
          {
            icon: NotebookPenIcon,
            title: "Notes",
            description: "Prep notes and event briefs",
          },
        ],
      },
      {
        value: "kitchen",
        label: "Kitchen",
        items: [
          {
            icon: ClipboardIcon,
            title: "Prep Tasks",
            description: "Checklists and assignments",
          },
          {
            icon: ListTodoIcon,
            title: "Production",
            description: "Batching and cook schedules",
          },
          {
            icon: ShieldCheckIcon,
            title: "Compliance",
            description: "Allergens and safety logs",
          },
        ],
      },
      {
        value: "operations",
        label: "Operations",
        items: [
          {
            icon: UsersIcon,
            title: "Staffing",
            description: "Staffing plans and coverage",
          },
          {
            icon: BriefcaseIcon,
            title: "Vendors",
            description: "Partner and supplier details",
          },
          {
            icon: CloudIcon,
            title: "Reports",
            description: "Ops snapshots and exports",
          },
        ],
      },
    ],
    ctaText: "Need a shortcut?",
    ctaDescription: "Jump straight to your most-used modules from here.",
  },
};
