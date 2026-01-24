import { AspectRatio } from "@repo/design-system/components/ui/aspect-ratio";
import type { Meta, StoryObj } from "@storybook/react";
/**
 * Displays content within a desired ratio.
 */
declare const meta: Meta<typeof AspectRatio>;
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the aspect ratio.
 */
export declare const Default: Story;
/**
 * Use the `1:1` aspect ratio to display a square image.
 */
export declare const Square: Story;
/**
 * Use the `4:3` aspect ratio to display a landscape image.
 */
export declare const Landscape: Story;
/**
 * Use the `2.35:1` aspect ratio to display a cinemascope image.
 */
export declare const Cinemascope: Story;
//# sourceMappingURL=aspect-ratio.stories.d.ts.map
