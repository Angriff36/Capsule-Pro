Object.defineProperty(exports, "__esModule", { value: true });
exports.Right = exports.Left = exports.Bottom = exports.Default = void 0;
const tooltip_1 = require("@repo/design-system/components/ui/tooltip");
const lucide_react_1 = require("lucide-react");
/**
 * A popup that displays information related to an element when the element
 * receives keyboard focus or the mouse hovers over it.
 */
const meta = {
  title: "ui/Tooltip",
  component: tooltip_1.TooltipContent,
  tags: ["autodocs"],
  argTypes: {
    side: {
      options: ["top", "bottom", "left", "right"],
      control: {
        type: "radio",
      },
    },
    children: {
      control: "text",
    },
  },
  args: {
    side: "top",
    children: "Add to library",
  },
  parameters: {
    layout: "centered",
  },
  render: (args) => (
    <tooltip_1.TooltipProvider>
      <tooltip_1.Tooltip>
        <tooltip_1.TooltipTrigger>
          <lucide_react_1.Plus className="h-4 w-4" />
          <span className="sr-only">Add</span>
        </tooltip_1.TooltipTrigger>
        <tooltip_1.TooltipContent {...args} />
      </tooltip_1.Tooltip>
    </tooltip_1.TooltipProvider>
  ),
};
exports.default = meta;
/**
 * The default form of the tooltip.
 */
exports.Default = {};
/**
 * Use the `bottom` side to display the tooltip below the element.
 */
exports.Bottom = {
  args: {
    side: "bottom",
  },
};
/**
 * Use the `left` side to display the tooltip to the left of the element.
 */
exports.Left = {
  args: {
    side: "left",
  },
};
/**
 * Use the `right` side to display the tooltip to the right of the element.
 */
exports.Right = {
  args: {
    side: "right",
  },
};
