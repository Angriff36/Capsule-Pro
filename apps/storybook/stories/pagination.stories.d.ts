import { Pagination } from "@repo/design-system/components/ui/pagination";
import type { StoryObj } from "@storybook/react";
/**
 * Pagination with page navigation, next and previous links.
 */
declare const meta: {
  title: string;
  component: typeof Pagination;
  tags: string[];
  argTypes: {};
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
 * The default form of the pagination.
 */
export declare const Default: Story;
//# sourceMappingURL=pagination.stories.d.ts.map
