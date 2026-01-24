Object.defineProperty(exports, "__esModule", { value: true });
exports.WithButton =
  exports.WithHelperText =
  exports.WithLabel =
  exports.Disabled =
  exports.Default =
    void 0;
const input_1 = require("@repo/design-system/components/ui/input");
/**
 * Displays a form input field or a component that looks like an input field.
 */
const meta = {
  title: "ui/Input",
  component: input_1.Input,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    className: "w-96",
    type: "email",
    placeholder: "Email",
    disabled: false,
  },
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the input field.
 */
exports.Default = {};
/**
 * Use the `disabled` prop to make the input non-interactive and appears faded,
 * indicating that input is not currently accepted.
 */
exports.Disabled = {
  args: { disabled: true },
};
/**
 * Use the `Label` component to includes a clear, descriptive label above or
 * alongside the input area to guide users.
 */
exports.WithLabel = {
  render: (args) => (
    <div className="grid items-center gap-1.5">
      <label htmlFor="email">{args.placeholder}</label>
      <input_1.Input {...args} id="email" />
    </div>
  ),
};
/**
 * Use a text element below the input field to provide additional instructions
 * or information to users.
 */
exports.WithHelperText = {
  render: (args) => (
    <div className="grid items-center gap-1.5">
      <label htmlFor="email-2">{args.placeholder}</label>
      <input_1.Input {...args} id="email-2" />
      <p className="text-foreground/50 text-sm">Enter your email address.</p>
    </div>
  ),
};
/**
 * Use the `Button` component to indicate that the input field can be submitted
 * or used to trigger an action.
 */
exports.WithButton = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <input_1.Input {...args} />
      <button
        className="rounded bg-primary px-4 py-2 text-primary-foreground"
        type="submit"
      >
        Subscribe
      </button>
    </div>
  ),
};
