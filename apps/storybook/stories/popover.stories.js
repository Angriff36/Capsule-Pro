Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const popover_1 = require("@repo/design-system/components/ui/popover");
/**
 * Displays rich content in a portal, triggered by a button.
 */
const meta = {
  title: "ui/Popover",
  component: popover_1.Popover,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <popover_1.Popover {...args}>
      <popover_1.PopoverTrigger>Open</popover_1.PopoverTrigger>
      <popover_1.PopoverContent>
        Place content for the popover here.
      </popover_1.PopoverContent>
    </popover_1.Popover>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the popover.
 */
exports.Default = {};
