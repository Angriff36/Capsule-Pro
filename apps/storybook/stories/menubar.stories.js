Object.defineProperty(exports, "__esModule", { value: true });
exports.WithCheckboxItems =
  exports.WithRadioItems =
  exports.WithSubmenu =
  exports.Default =
    void 0;
const menubar_1 = require("@repo/design-system/components/ui/menubar");
/**
 * A visually persistent menu common in desktop applications that provides
 * quick access to a consistent set of commands.
 */
const meta = {
  title: "ui/Menubar",
  component: menubar_1.Menubar,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <menubar_1.Menubar {...args}>
      <menubar_1.MenubarMenu>
        <menubar_1.MenubarTrigger>File</menubar_1.MenubarTrigger>
        <menubar_1.MenubarContent>
          <menubar_1.MenubarItem>
            New Tab <menubar_1.MenubarShortcut>⌘T</menubar_1.MenubarShortcut>
          </menubar_1.MenubarItem>
          <menubar_1.MenubarItem>New Window</menubar_1.MenubarItem>
          <menubar_1.MenubarSeparator />
          <menubar_1.MenubarItem disabled>Share</menubar_1.MenubarItem>
          <menubar_1.MenubarSeparator />
          <menubar_1.MenubarItem>Print</menubar_1.MenubarItem>
        </menubar_1.MenubarContent>
      </menubar_1.MenubarMenu>
    </menubar_1.Menubar>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the menubar.
 */
exports.Default = {};
/**
 * A menubar with a submenu.
 */
exports.WithSubmenu = {
  render: (args) => (
    <menubar_1.Menubar {...args}>
      <menubar_1.MenubarMenu>
        <menubar_1.MenubarTrigger>Actions</menubar_1.MenubarTrigger>
        <menubar_1.MenubarContent>
          <menubar_1.MenubarItem>Download</menubar_1.MenubarItem>
          <menubar_1.MenubarSub>
            <menubar_1.MenubarSubTrigger>Share</menubar_1.MenubarSubTrigger>
            <menubar_1.MenubarSubContent>
              <menubar_1.MenubarItem>Email link</menubar_1.MenubarItem>
              <menubar_1.MenubarItem>Messages</menubar_1.MenubarItem>
              <menubar_1.MenubarItem>Notes</menubar_1.MenubarItem>
            </menubar_1.MenubarSubContent>
          </menubar_1.MenubarSub>
        </menubar_1.MenubarContent>
      </menubar_1.MenubarMenu>
    </menubar_1.Menubar>
  ),
};
/**
 * A menubar with radio items.
 */
exports.WithRadioItems = {
  render: (args) => (
    <menubar_1.Menubar {...args}>
      <menubar_1.MenubarMenu>
        <menubar_1.MenubarTrigger>View</menubar_1.MenubarTrigger>
        <menubar_1.MenubarContent>
          <menubar_1.MenubarLabel inset>Device Size</menubar_1.MenubarLabel>
          <menubar_1.MenubarRadioGroup value="md">
            <menubar_1.MenubarRadioItem value="sm">
              Small
            </menubar_1.MenubarRadioItem>
            <menubar_1.MenubarRadioItem value="md">
              Medium
            </menubar_1.MenubarRadioItem>
            <menubar_1.MenubarRadioItem value="lg">
              Large
            </menubar_1.MenubarRadioItem>
          </menubar_1.MenubarRadioGroup>
        </menubar_1.MenubarContent>
      </menubar_1.MenubarMenu>
    </menubar_1.Menubar>
  ),
};
/**
 * A menubar with checkbox items.
 */
exports.WithCheckboxItems = {
  render: (args) => (
    <menubar_1.Menubar {...args}>
      <menubar_1.MenubarMenu>
        <menubar_1.MenubarTrigger>Filters</menubar_1.MenubarTrigger>
        <menubar_1.MenubarContent>
          <menubar_1.MenubarItem>Show All</menubar_1.MenubarItem>
          <menubar_1.MenubarGroup>
            <menubar_1.MenubarCheckboxItem checked>
              Unread
            </menubar_1.MenubarCheckboxItem>
            <menubar_1.MenubarCheckboxItem checked>
              Important
            </menubar_1.MenubarCheckboxItem>
            <menubar_1.MenubarCheckboxItem>
              Flagged
            </menubar_1.MenubarCheckboxItem>
          </menubar_1.MenubarGroup>
        </menubar_1.MenubarContent>
      </menubar_1.MenubarMenu>
    </menubar_1.Menubar>
  ),
};
