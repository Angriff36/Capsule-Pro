import { Alert } from "@repo/design-system/components/ui/alert";
import type { StoryObj } from "@storybook/react";
/**
 * Displays a callout for user attention.
 */
declare const meta: {
  title: string;
  component: typeof Alert;
  tags: string[];
  argTypes: {
    variant: {
      options: string[];
      control: {
        type: "radio";
      };
    };
  };
  args: {
    variant: "default";
  };
  render: (
    args: import("react").ClassAttributes<HTMLDivElement> &
      import("react").HTMLAttributes<HTMLDivElement> &
      import("class-variance-authority").VariantProps<
        (
          props?:
            | ({
                variant?: "default" | "destructive" | null | undefined;
              } & import("class-variance-authority/types").ClassProp)
            | undefined
        ) => string
      >
  ) => import("react").JSX.Element;
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the alert.
 */
export declare const Default: Story;
/**
 * Use the `destructive` alert to indicate a destructive action.
 */
export declare const Destructive: Story;
//# sourceMappingURL=alert.stories.d.ts.map
