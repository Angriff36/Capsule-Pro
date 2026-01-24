import { Table } from "@repo/design-system/components/ui/table";
import type { StoryObj } from "@storybook/react";
/**
 * Powerful table and datagrids built using TanStack Table.
 */
declare const meta: {
  title: string;
  component: typeof Table;
  tags: string[];
  argTypes: {};
  render: (
    args: import("react").ClassAttributes<HTMLTableElement> &
      import("react").TableHTMLAttributes<HTMLTableElement>
  ) => import("react").JSX.Element;
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the table.
 */
export declare const Default: Story;
//# sourceMappingURL=table.stories.d.ts.map
