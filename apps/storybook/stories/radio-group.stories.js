Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const radio_group_1 = require("@repo/design-system/components/ui/radio-group");
/**
 * A set of checkable buttons—known as radio buttons—where no more than one of
 * the buttons can be checked at a time.
 */
const meta = {
  title: "ui/RadioGroup",
  component: radio_group_1.RadioGroup,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    defaultValue: "comfortable",
    className: "grid gap-2 grid-cols-[1rem_1fr] items-center",
  },
  render: (args) => (
    <radio_group_1.RadioGroup {...args}>
      <radio_group_1.RadioGroupItem id="r1" value="default" />
      <label htmlFor="r1">Default</label>
      <radio_group_1.RadioGroupItem id="r2" value="comfortable" />
      <label htmlFor="r2">Comfortable</label>
      <radio_group_1.RadioGroupItem id="r3" value="compact" />
      <label htmlFor="r3">Compact</label>
    </radio_group_1.RadioGroup>
  ),
};
exports.default = meta;
/**
 * The default form of the radio group.
 */
exports.Default = {};
