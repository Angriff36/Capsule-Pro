Object.defineProperty(exports, "__esModule", { value: true });
exports.Disabled = exports.Default = void 0;
const switch_1 = require("@repo/design-system/components/ui/switch");
/**
 * A control that allows the user to toggle between checked and not checked.
 */
const meta = {
  title: "ui/Switch",
  component: switch_1.Switch,
  tags: ["autodocs"],
  argTypes: {},
  parameters: {
    layout: "centered",
  },
  render: (args) => (
    <div className="flex items-center space-x-2">
      <switch_1.Switch {...args} />
      <label className="peer-disabled:text-foreground/50" htmlFor={args.id}>
        Airplane Mode
      </label>
    </div>
  ),
};
exports.default = meta;
/**
 * The default form of the switch.
 */
exports.Default = {
  args: {
    id: "default-switch",
  },
};
/**
 * Use the `disabled` prop to disable the switch.
 */
exports.Disabled = {
  args: {
    id: "disabled-switch",
    disabled: true,
  },
};
