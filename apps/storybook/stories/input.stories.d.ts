import { Input } from "@repo/design-system/components/ui/input";
import type { StoryObj } from "@storybook/react";
/**
 * Displays a form input field or a component that looks like an input field.
 */
declare const meta: {
  title: string;
  component: typeof Input;
  tags: string[];
  argTypes: {};
  args: {
    className: string;
    type: "email";
    placeholder: string;
    disabled: false;
  };
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the input field.
 */
export declare const Default: Story;
/**
 * Use the `disabled` prop to make the input non-interactive and appears faded,
 * indicating that input is not currently accepted.
 */
export declare const Disabled: Story;
/**
 * Use the `Label` component to includes a clear, descriptive label above or
 * alongside the input area to guide users.
 */
export declare const WithLabel: Story;
/**
 * Use a text element below the input field to provide additional instructions
 * or information to users.
 */
export declare const WithHelperText: Story;
/**
 * Use the `Button` component to indicate that the input field can be submitted
 * or used to trigger an action.
 */
export declare const WithButton: Story;
//# sourceMappingURL=input.stories.d.ts.map
