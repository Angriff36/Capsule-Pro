import { Toggle } from "@repo/design-system/components/ui/toggle";
import type { Meta, StoryObj } from "@storybook/react";
/**
 * A two-state button that can be either on or off.
 */
declare const meta: Meta<typeof Toggle>;
export default meta;
type Story = StoryObj<typeof Toggle>;
/**
 * The default form of the toggle.
 */
export declare const Default: Story;
/**
 * Use the `outline` variant for a distinct outline, emphasizing the boundary
 * of the selection circle for clearer visibility
 */
export declare const Outline: Story;
/**
 * Use the text element to add a label to the toggle.
 */
export declare const WithText: Story;
/**
 * Use the `sm` size for a smaller toggle, suitable for interfaces needing
 * compact elements without sacrificing usability.
 */
export declare const Small: Story;
/**
 * Use the `lg` size for a larger toggle, offering better visibility and
 * easier interaction for users.
 */
export declare const Large: Story;
/**
 * Add the `disabled` prop to prevent interactions with the toggle.
 */
export declare const Disabled: Story;
//# sourceMappingURL=toggle.stories.d.ts.map
