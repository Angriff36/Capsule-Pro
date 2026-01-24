import { Card } from "@repo/design-system/components/ui/card";
import type { StoryObj } from "@storybook/react";
/**
 * Displays a card with header, content, and footer.
 */
declare const meta: {
  title: string;
  component: typeof Card;
  tags: string[];
  argTypes: {};
  args: {
    className: string;
  };
  render: (
    args: import("react").ClassAttributes<HTMLDivElement> &
      import("react").HTMLAttributes<HTMLDivElement>
  ) => import("react").JSX.Element;
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the card.
 */
export declare const Default: Story;
//# sourceMappingURL=card.stories.d.ts.map
