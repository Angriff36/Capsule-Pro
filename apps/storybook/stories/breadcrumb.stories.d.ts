import { Breadcrumb } from "@repo/design-system/components/ui/breadcrumb";
import type { StoryObj } from "@storybook/react";
/**
 * Displays the path to the current resource using a hierarchy of links.
 */
declare const meta: {
  title: string;
  component: typeof Breadcrumb;
  tags: string[];
  argTypes: {};
  args: {};
  render: (
    args: import("react").ClassAttributes<HTMLElement> &
      import("react").HTMLAttributes<HTMLElement>
  ) => import("react").JSX.Element;
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * Displays the path of links to the current resource.
 */
export declare const Default: Story;
/**
 * Displays the path with a custom icon for the separator.
 */
export declare const WithCustomSeparator: Story;
//# sourceMappingURL=breadcrumb.stories.d.ts.map
