Object.defineProperty(exports, "__esModule", { value: true });
exports.Outline =
  exports.Destructive =
  exports.Secondary =
  exports.Default =
    void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
/**
 * Displays a badge or a component that looks like a badge.
 */
const meta = {
  title: "ui/Badge",
  component: badge_1.Badge,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: "text",
    },
  },
  args: {
    children: "Badge",
  },
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the badge.
 */
exports.Default = {};
/**
 * Use the `secondary` badge to call for less urgent information, blending
 * into the interface while still signaling minor updates or statuses.
 */
exports.Secondary = {
  args: {
    variant: "secondary",
  },
};
/**
 * Use the `destructive` badge to  indicate errors, alerts, or the need for
 * immediate attention.
 */
exports.Destructive = {
  args: {
    variant: "destructive",
  },
};
/**
 * Use the `outline` badge for overlaying without obscuring interface details,
 * emphasizing clarity and subtlety..
 */
exports.Outline = {
  args: {
    variant: "outline",
  },
};
