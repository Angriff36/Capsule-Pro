Object.defineProperty(exports, "__esModule", { value: true });
exports.Disabled =
  exports.Icon =
  exports.Large =
  exports.Small =
  exports.WithIcon =
  exports.Loading =
  exports.Link =
  exports.Destructive =
  exports.Secondary =
  exports.Ghost =
  exports.Outline =
  exports.Default =
    void 0;
const button_1 = require("@repo/design-system/components/ui/button");
const lucide_react_1 = require("lucide-react");
/**
 * Displays a button or a component that looks like a button.
 */
const meta = {
  title: "ui/Button",
  component: button_1.Button,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: "text",
    },
  },
  parameters: {
    layout: "centered",
  },
  args: {
    variant: "default",
    size: "default",
    children: "Button",
  },
};
exports.default = meta;
/**
 * The default form of the button, used for primary actions and commands.
 */
exports.Default = {};
/**
 * Use the `outline` button to reduce emphasis on secondary actions, such as
 * canceling or dismissing a dialog.
 */
exports.Outline = {
  args: {
    variant: "outline",
  },
};
/**
 * Use the `ghost` button is minimalistic and subtle, for less intrusive
 * actions.
 */
exports.Ghost = {
  args: {
    variant: "ghost",
  },
};
/**
 * Use the `secondary` button to call for less emphasized actions, styled to
 * complement the primary button while being less conspicuous.
 */
exports.Secondary = {
  args: {
    variant: "secondary",
  },
};
/**
 * Use the `destructive` button to indicate errors, alerts, or the need for
 * immediate attention.
 */
exports.Destructive = {
  args: {
    variant: "destructive",
  },
};
/**
 * Use the `link` button to reduce emphasis on tertiary actions, such as
 * hyperlink or navigation, providing a text-only interactive element.
 */
exports.Link = {
  args: {
    variant: "link",
  },
};
/**
 * Add the `disabled` prop to a button to prevent interactions and add a
 * loading indicator, such as a spinner, to signify an in-progress action.
 */
exports.Loading = {
  render: (args) => (
    <button_1.Button {...args}>
      <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Button
    </button_1.Button>
  ),
  args: {
    ...exports.Outline.args,
    disabled: true,
  },
};
/**
 * Add an icon element to a button to enhance visual communication and
 * providing additional context for the action.
 */
exports.WithIcon = {
  render: (args) => (
    <button_1.Button {...args}>
      <lucide_react_1.Mail className="mr-2 h-4 w-4" /> Login with Email Button
    </button_1.Button>
  ),
  args: {
    ...exports.Secondary.args,
  },
};
/**
 * Use the `sm` size for a smaller button, suitable for interfaces needing
 * compact elements without sacrificing usability.
 */
exports.Small = {
  args: {
    size: "sm",
  },
};
/**
 * Use the `lg` size for a larger button, offering better visibility and
 * easier interaction for users.
 */
exports.Large = {
  args: {
    size: "lg",
  },
};
/**
 * Use the "icon" size for a button with only an icon.
 */
exports.Icon = {
  args: {
    ...exports.Secondary.args,
    size: "icon",
    children: <lucide_react_1.Mail />,
  },
};
/**
 * Add the `disabled` prop to prevent interactions with the button.
 */
exports.Disabled = {
  args: {
    disabled: true,
  },
};
