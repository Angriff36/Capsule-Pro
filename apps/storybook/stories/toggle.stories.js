Object.defineProperty(exports, "__esModule", { value: true });
exports.Disabled =
  exports.Large =
  exports.Small =
  exports.WithText =
  exports.Outline =
  exports.Default =
    void 0;
const toggle_1 = require("@repo/design-system/components/ui/toggle");
const lucide_react_1 = require("lucide-react");
/**
 * A two-state button that can be either on or off.
 */
const meta = {
  title: "ui/Toggle",
  component: toggle_1.Toggle,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: { disable: true },
    },
  },
  args: {
    children: <lucide_react_1.Bold className="h-4 w-4" />,
    "aria-label": "Toggle bold",
  },
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the toggle.
 */
exports.Default = {};
/**
 * Use the `outline` variant for a distinct outline, emphasizing the boundary
 * of the selection circle for clearer visibility
 */
exports.Outline = {
  args: {
    variant: "outline",
    children: <lucide_react_1.Italic className="h-4 w-4" />,
    "aria-label": "Toggle italic",
  },
};
/**
 * Use the text element to add a label to the toggle.
 */
exports.WithText = {
  render: (args) => (
    <toggle_1.Toggle {...args}>
      <lucide_react_1.Italic className="mr-2 h-4 w-4" />
      Italic
    </toggle_1.Toggle>
  ),
  args: { ...exports.Outline.args },
};
/**
 * Use the `sm` size for a smaller toggle, suitable for interfaces needing
 * compact elements without sacrificing usability.
 */
exports.Small = {
  args: {
    size: "sm",
  },
};
/**
 * Use the `lg` size for a larger toggle, offering better visibility and
 * easier interaction for users.
 */
exports.Large = {
  args: {
    size: "lg",
  },
};
/**
 * Add the `disabled` prop to prevent interactions with the toggle.
 */
exports.Disabled = {
  args: {
    disabled: true,
  },
};
