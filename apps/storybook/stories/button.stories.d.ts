import { Button } from "@repo/design-system/components/ui/button";
import type { StoryObj } from "@storybook/react";
/**
 * Displays a button or a component that looks like a button.
 */
declare const meta: {
  title: string;
  component: typeof Button;
  tags: string[];
  argTypes: {
    children: {
      control: "text";
    };
  };
  parameters: {
    layout: string;
  };
  args: {
    variant: "default";
    size: "default";
    children: string;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the button, used for primary actions and commands.
 */
export declare const Default: Story;
/**
 * Use the `outline` button to reduce emphasis on secondary actions, such as
 * canceling or dismissing a dialog.
 */
export declare const Outline: Story;
/**
 * Use the `ghost` button is minimalistic and subtle, for less intrusive
 * actions.
 */
export declare const Ghost: Story;
/**
 * Use the `secondary` button to call for less emphasized actions, styled to
 * complement the primary button while being less conspicuous.
 */
export declare const Secondary: Story;
/**
 * Use the `destructive` button to indicate errors, alerts, or the need for
 * immediate attention.
 */
export declare const Destructive: Story;
/**
 * Use the `link` button to reduce emphasis on tertiary actions, such as
 * hyperlink or navigation, providing a text-only interactive element.
 */
export declare const Link: Story;
/**
 * Add the `disabled` prop to a button to prevent interactions and add a
 * loading indicator, such as a spinner, to signify an in-progress action.
 */
export declare const Loading: Story;
/**
 * Add an icon element to a button to enhance visual communication and
 * providing additional context for the action.
 */
export declare const WithIcon: Story;
/**
 * Use the `sm` size for a smaller button, suitable for interfaces needing
 * compact elements without sacrificing usability.
 */
export declare const Small: Story;
/**
 * Use the `lg` size for a larger button, offering better visibility and
 * easier interaction for users.
 */
export declare const Large: Story;
/**
 * Use the "icon" size for a button with only an icon.
 */
export declare const Icon: Story;
/**
 * Add the `disabled` prop to prevent interactions with the button.
 */
export declare const Disabled: Story;
//# sourceMappingURL=button.stories.d.ts.map
