Object.defineProperty(exports, "__esModule", { value: true });
exports.WithButton =
  exports.WithText =
  exports.WithLabel =
  exports.Disabled =
  exports.Default =
    void 0;
const textarea_1 = require("@repo/design-system/components/ui/textarea");
/**
 * Displays a form textarea or a component that looks like a textarea.
 */
const meta = {
  title: "ui/Textarea",
  component: textarea_1.Textarea,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    placeholder: "Type your message here.",
    disabled: false,
  },
};
exports.default = meta;
/**
 * The default form of the textarea.
 */
exports.Default = {};
/**
 * Use the `disabled` prop to disable the textarea.
 */
exports.Disabled = {
  args: {
    disabled: true,
  },
};
/**
 * Use the `Label` component to includes a clear, descriptive label above or
 * alongside the text area to guide users.
 */
exports.WithLabel = {
  render: (args) => (
    <div className="grid w-full gap-1.5">
      <label htmlFor="message">Your message</label>
      <textarea_1.Textarea {...args} id="message" />
    </div>
  ),
};
/**
 * Use a text element below the text area to provide additional instructions
 * or information to users.
 */
exports.WithText = {
  render: (args) => (
    <div className="grid w-full gap-1.5">
      <label htmlFor="message-2">Your Message</label>
      <textarea_1.Textarea {...args} id="message-2" />
      <p className="text-slate-500 text-sm">
        Your message will be copied to the support team.
      </p>
    </div>
  ),
};
/**
 * Use the `Button` component to indicate that the text area can be submitted
 * or used to trigger an action.
 */
exports.WithButton = {
  render: (args) => (
    <div className="grid w-full gap-2">
      <textarea_1.Textarea {...args} />
      <button
        className="rounded bg-primary px-4 py-2 text-primary-foreground"
        type="submit"
      >
        Send Message
      </button>
    </div>
  ),
};
