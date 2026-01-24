import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { StoryObj } from "@storybook/react";
/**
 * Displays a form textarea or a component that looks like a textarea.
 */
declare const meta: {
  title: string;
  component: typeof Textarea;
  tags: string[];
  argTypes: {};
  args: {
    placeholder: string;
    disabled: false;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the textarea.
 */
export declare const Default: Story;
/**
 * Use the `disabled` prop to disable the textarea.
 */
export declare const Disabled: Story;
/**
 * Use the `Label` component to includes a clear, descriptive label above or
 * alongside the text area to guide users.
 */
export declare const WithLabel: Story;
/**
 * Use a text element below the text area to provide additional instructions
 * or information to users.
 */
export declare const WithText: Story;
/**
 * Use the `Button` component to indicate that the text area can be submitted
 * or used to trigger an action.
 */
export declare const WithButton: Story;
//# sourceMappingURL=textarea.stories.d.ts.map
