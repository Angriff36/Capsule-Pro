Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const tabs_1 = require("@repo/design-system/components/ui/tabs");
/**
 * A set of layered sections of content—known as tab panels—that are displayed
 * one at a time.
 */
const meta = {
  title: "ui/Tabs",
  component: tabs_1.Tabs,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    defaultValue: "account",
    className: "w-96",
  },
  render: (args) => (
    <tabs_1.Tabs {...args}>
      <tabs_1.TabsList className="grid grid-cols-2">
        <tabs_1.TabsTrigger value="account">Account</tabs_1.TabsTrigger>
        <tabs_1.TabsTrigger value="password">Password</tabs_1.TabsTrigger>
      </tabs_1.TabsList>
      <tabs_1.TabsContent value="account">
        Make changes to your account here.
      </tabs_1.TabsContent>
      <tabs_1.TabsContent value="password">
        Change your password here.
      </tabs_1.TabsContent>
    </tabs_1.Tabs>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the tabs.
 */
exports.Default = {};
