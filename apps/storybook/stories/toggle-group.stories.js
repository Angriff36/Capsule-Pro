Object.defineProperty(exports, "__esModule", { value: true });
exports.Disabled =
  exports.Large =
  exports.Small =
  exports.Single =
  exports.Outline =
  exports.Default =
    void 0;
const toggle_group_1 = require("@repo/design-system/components/ui/toggle-group");
const lucide_react_1 = require("lucide-react");
/**
 * A set of two-state buttons that can be toggled on or off.
 */
const meta = {
  title: "ui/ToggleGroup",
  component: toggle_group_1.ToggleGroup,
  tags: ["autodocs"],
  argTypes: {
    type: {
      options: ["multiple", "single"],
      control: { type: "radio" },
    },
  },
  args: {
    variant: "default",
    size: "default",
    type: "multiple",
    disabled: false,
  },
  render: (args) => (
    <toggle_group_1.ToggleGroup {...args}>
      <toggle_group_1.ToggleGroupItem aria-label="Toggle bold" value="bold">
        <lucide_react_1.Bold className="h-4 w-4" />
      </toggle_group_1.ToggleGroupItem>
      <toggle_group_1.ToggleGroupItem aria-label="Toggle italic" value="italic">
        <lucide_react_1.Italic className="h-4 w-4" />
      </toggle_group_1.ToggleGroupItem>
      <toggle_group_1.ToggleGroupItem
        aria-label="Toggle underline"
        value="underline"
      >
        <lucide_react_1.Underline className="h-4 w-4" />
      </toggle_group_1.ToggleGroupItem>
    </toggle_group_1.ToggleGroup>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the toggle group.
 */
exports.Default = {};
/**
 * Use the `outline` variant to emphasizing the individuality of each button
 * while keeping them visually cohesive.
 */
exports.Outline = {
  args: {
    variant: "outline",
  },
};
/**
 * Use the `single` type to create exclusive selection within the button
 * group, allowing only one button to be active at a time.
 */
exports.Single = {
  args: {
    type: "single",
  },
};
/**
 * Use the `sm` size for a compact version of the button group, featuring
 * smaller buttons for spaces with limited real estate.
 */
exports.Small = {
  args: {
    size: "sm",
  },
};
/**
 * Use the `lg` size for a more prominent version of the button group, featuring
 * larger buttons for emphasis.
 */
exports.Large = {
  args: {
    size: "lg",
  },
};
/**
 * Add the `disabled` prop to a button to prevent interactions.
 */
exports.Disabled = {
  args: {
    disabled: true,
  },
};
