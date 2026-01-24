import { Command } from "@repo/design-system/components/ui/command";
import type { StoryObj } from "@storybook/react";
/**
 * Fast, composable, unstyled command menu for React.
 */
declare const meta: {
  title: string;
  component: typeof Command;
  tags: string[];
  argTypes: {};
  args: {
    className: string;
  };
  render: (
    args: {
      children?: React.ReactNode;
    } & Pick<
      Pick<
        import("react").DetailedHTMLProps<
          import("react").HTMLAttributes<HTMLDivElement>,
          HTMLDivElement
        >,
        "key" | keyof import("react").HTMLAttributes<HTMLDivElement>
      > & {
        ref?: React.Ref<HTMLDivElement>;
      } & {
        asChild?: boolean;
      },
      "key" | keyof import("react").HTMLAttributes<HTMLDivElement> | "asChild"
    > & {
        label?: string;
        shouldFilter?: boolean;
        filter?: (value: string, search: string, keywords?: string[]) => number;
        defaultValue?: string;
        value?: string;
        onValueChange?: (value: string) => void;
        loop?: boolean;
        disablePointerSelection?: boolean;
        vimBindings?: boolean;
      } & import("react").RefAttributes<HTMLDivElement>
  ) => import("react").JSX.Element;
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the command.
 */
export declare const Default: Story;
//# sourceMappingURL=command.stories.d.ts.map
