import { TooltipContent } from "@repo/design-system/components/ui/tooltip";
import type { Meta, StoryObj } from "@storybook/react";
/**
 * A popup that displays information related to an element when the element
 * receives keyboard focus or the mouse hovers over it.
 */
declare const meta: Meta<typeof TooltipContent>;
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the tooltip.
 */
export declare const Default: Story;
/**
 * Use the `bottom` side to display the tooltip below the element.
 */
export declare const Bottom: Story;
/**
 * Use the `left` side to display the tooltip to the left of the element.
 */
export declare const Left: Story;
/**
 * Use the `right` side to display the tooltip to the right of the element.
 */
export declare const Right: Story;
//# sourceMappingURL=tooltip.stories.d.ts.map
