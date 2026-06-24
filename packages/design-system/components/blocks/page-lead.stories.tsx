import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../ui/button";
import {
  OperationalColumn,
  PageBody,
  PageCanvas,
  PageLead,
  SectionHeader,
} from "./page-shell";
import {
  ActivityFeed,
  ActivityStats,
  type ActivityFeedItem,
} from "./activity-feed";

const sampleActivities: ActivityFeedItem[] = [
  {
    id: "1",
    tenantId: "t1",
    activityType: "entity_change",
    entityType: "Event",
    entityId: "evt-1",
    action: "create",
    title: "Event.create",
    description: "Emitted Event.created",
    metadata: { source: "reaction_logs" },
    performedBy: "user_1",
    performerName: "Alex Chen",
    correlationId: null,
    parentId: null,
    sourceType: "manifest_command",
    sourceId: null,
    importance: "normal",
    visibility: "all",
    createdAt: new Date(),
  },
  {
    id: "2",
    tenantId: "t1",
    activityType: "entity_change",
    entityType: "Recipe",
    entityId: "rec-1",
    action: "update",
    title: "Recipe.update",
    description: "Recipe costing refreshed",
    metadata: null,
    performedBy: "user_2",
    performerName: "Jordan Lee",
    correlationId: null,
    parentId: null,
    sourceType: "manifest_command",
    sourceId: null,
    importance: "high",
    visibility: "all",
    createdAt: new Date(Date.now() - 3_600_000),
  },
];

const meta = {
  title: "Blocks/PageLead",
  component: PageLead,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof PageLead>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Light page header — no CommandBand */
export const HeaderOnly: Story = {
  args: {
    description:
      "Monitor system events, entity changes, and collaborator actions.",
    eyebrow: "Analytics / Activity",
    title: "Activity feed",
  },
  render: (args) => (
    <PageCanvas>
      <PageLead {...args} />
    </PageCanvas>
  ),
};

/** Full operational page recipe used on /analytics/activity-feed */
export const ActivityFeedPage: Story = {
  args: {
    description:
      "Monitor system events, entity changes, AI plan approvals, and collaborator actions across your organization.",
    eyebrow: "Analytics / Activity",
    title: "Activity feed",
  },
  render: (args) => (
    <PageCanvas>
      <PageLead
        {...args}
        actions={
          <Button size="sm" variant="outline">
            Export
          </Button>
        }
      />
      <PageBody>
        <OperationalColumn>
          <ActivityStats
            todayCount={3}
            totalCount={128}
            variant="panel"
            weekCount={24}
            byEntity={{}}
            byType={{}}
          />
          <section className="space-y-6">
            <SectionHeader title="Recent activity" />
            <ActivityFeed
              activities={sampleActivities}
              showHeader={false}
              variant="panel"
            />
          </section>
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  ),
};
