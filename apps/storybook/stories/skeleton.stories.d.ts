import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import type { StoryObj } from "@storybook/react";
/**
 * Use to show a placeholder while content is loading.
 */
declare const meta: {
  title: string;
  component: typeof Skeleton;
  tags: string[];
  argTypes: {};
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof Skeleton>;
/**
 * The default form of the skeleton.
 */
export declare const Default: Story;
//# sourceMappingURL=skeleton.stories.d.ts.map
