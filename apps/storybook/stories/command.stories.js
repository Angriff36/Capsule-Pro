Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const command_1 = require("@repo/design-system/components/ui/command");
const cmdk_1 = require("cmdk");
/**
 * Fast, composable, unstyled command menu for React.
 */
const meta = {
  title: "ui/Command",
  component: command_1.Command,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    className: "rounded-lg w-96 border shadow-md",
  },
  render: (args) => (
    <command_1.Command {...args}>
      <command_1.CommandInput placeholder="Type a command or search..." />
      <command_1.CommandList>
        <command_1.CommandEmpty>No results found.</command_1.CommandEmpty>
        <command_1.CommandGroup heading="Suggestions">
          <command_1.CommandItem>Calendar</command_1.CommandItem>
          <command_1.CommandItem>Search Emoji</command_1.CommandItem>
          <command_1.CommandItem>Calculator</command_1.CommandItem>
        </command_1.CommandGroup>
        <cmdk_1.CommandSeparator />
        <command_1.CommandGroup heading="Settings">
          <command_1.CommandItem>Profile</command_1.CommandItem>
          <command_1.CommandItem>Billing</command_1.CommandItem>
          <command_1.CommandItem>Settings</command_1.CommandItem>
        </command_1.CommandGroup>
      </command_1.CommandList>
    </command_1.Command>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the command.
 */
exports.Default = {};
