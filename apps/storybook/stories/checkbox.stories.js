Object.defineProperty(exports, "__esModule", { value: true });
exports.Disabled = exports.Default = void 0;
const checkbox_1 = require("@repo/design-system/components/ui/checkbox");
/**
 * A control that allows the user to toggle between checked and not checked.
 */
const meta = {
  title: "ui/Checkbox",
  component: checkbox_1.Checkbox,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    id: "terms",
    disabled: false,
  },
  render: (args) => (
    <div className="flex space-x-2">
      <checkbox_1.Checkbox {...args} />
      <label
        className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        htmlFor={args.id}
      >
        Accept terms and conditions
      </label>
    </div>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the checkbox.
 */
exports.Default = {};
/**
 * Use the `disabled` prop to disable the checkbox.
 */
exports.Disabled = {
  args: {
    id: "disabled-terms",
    disabled: true,
  },
};
