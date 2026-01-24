Object.defineProperty(exports, "__esModule", { value: true });
exports.Disabled = exports.Default = void 0;
const collapsible_1 = require("@repo/design-system/components/ui/collapsible");
const lucide_react_1 = require("lucide-react");
/**
 * An interactive component which expands/collapses a panel.
 */
const meta = {
  title: "ui/Collapsible",
  component: collapsible_1.Collapsible,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    className: "w-96",
    disabled: false,
  },
  render: (args) => (
    <collapsible_1.Collapsible {...args}>
      <collapsible_1.CollapsibleTrigger className="flex gap-2">
        <h3 className="font-semibold">Can I use this in my project?</h3>
        <lucide_react_1.Info className="size-6" />
      </collapsible_1.CollapsibleTrigger>
      <collapsible_1.CollapsibleContent>
        Yes. Free to use for personal and commercial projects. No attribution
        required.
      </collapsible_1.CollapsibleContent>
    </collapsible_1.Collapsible>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the collapsible.
 */
exports.Default = {};
/**
 * Use the `disabled` prop to disable the interaction.
 */
exports.Disabled = {
  args: {
    disabled: true,
  },
};
