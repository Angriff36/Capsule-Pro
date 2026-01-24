Object.defineProperty(exports, "__esModule", { value: true });
exports.WithRadioGroup =
  exports.WithCheckboxes =
  exports.WithSubmenu =
  exports.WithShortcuts =
  exports.Default =
    void 0;
const context_menu_1 = require("@repo/design-system/components/ui/context-menu");
/**
 * Displays a menu to the user — such as a set of actions or functions —
 * triggered by a button.
 */
const meta = {
  title: "ui/ContextMenu",
  component: context_menu_1.ContextMenu,
  tags: ["autodocs"],
  argTypes: {},
  args: {},
  render: (args) => (
    <context_menu_1.ContextMenu {...args}>
      <context_menu_1.ContextMenuTrigger className="flex h-48 w-96 items-center justify-center rounded-md border border-dashed bg-accent text-sm">
        Right click here
      </context_menu_1.ContextMenuTrigger>
      <context_menu_1.ContextMenuContent className="w-32">
        <context_menu_1.ContextMenuItem>Profile</context_menu_1.ContextMenuItem>
        <context_menu_1.ContextMenuItem>Billing</context_menu_1.ContextMenuItem>
        <context_menu_1.ContextMenuItem>Team</context_menu_1.ContextMenuItem>
        <context_menu_1.ContextMenuItem>
          Subscription
        </context_menu_1.ContextMenuItem>
      </context_menu_1.ContextMenuContent>
    </context_menu_1.ContextMenu>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the context menu.
 */
exports.Default = {};
/**
 * A context menu with shortcuts.
 */
exports.WithShortcuts = {
  render: (args) => (
    <context_menu_1.ContextMenu {...args}>
      <context_menu_1.ContextMenuTrigger className="flex h-48 w-96 items-center justify-center rounded-md border border-dashed bg-accent text-sm">
        Right click here
      </context_menu_1.ContextMenuTrigger>
      <context_menu_1.ContextMenuContent className="w-32">
        <context_menu_1.ContextMenuItem>
          Back
          <context_menu_1.ContextMenuShortcut>
            ⌘[
          </context_menu_1.ContextMenuShortcut>
        </context_menu_1.ContextMenuItem>
        <context_menu_1.ContextMenuItem disabled>
          Forward
          <context_menu_1.ContextMenuShortcut>
            ⌘]
          </context_menu_1.ContextMenuShortcut>
        </context_menu_1.ContextMenuItem>
        <context_menu_1.ContextMenuItem>
          Reload
          <context_menu_1.ContextMenuShortcut>
            ⌘R
          </context_menu_1.ContextMenuShortcut>
        </context_menu_1.ContextMenuItem>
      </context_menu_1.ContextMenuContent>
    </context_menu_1.ContextMenu>
  ),
};
/**
 * A context menu with a submenu.
 */
exports.WithSubmenu = {
  render: (args) => (
    <context_menu_1.ContextMenu {...args}>
      <context_menu_1.ContextMenuTrigger className="flex h-48 w-96 items-center justify-center rounded-md border border-dashed bg-accent text-sm">
        Right click here
      </context_menu_1.ContextMenuTrigger>
      <context_menu_1.ContextMenuContent className="w-32">
        <context_menu_1.ContextMenuItem>
          New Tab
          <context_menu_1.ContextMenuShortcut>
            ⌘N
          </context_menu_1.ContextMenuShortcut>
        </context_menu_1.ContextMenuItem>
        <context_menu_1.ContextMenuSub>
          <context_menu_1.ContextMenuSubTrigger>
            More Tools
          </context_menu_1.ContextMenuSubTrigger>
          <context_menu_1.ContextMenuSubContent>
            <context_menu_1.ContextMenuItem>
              Save Page As...
              <context_menu_1.ContextMenuShortcut>
                ⇧⌘S
              </context_menu_1.ContextMenuShortcut>
            </context_menu_1.ContextMenuItem>
            <context_menu_1.ContextMenuItem>
              Create Shortcut...
            </context_menu_1.ContextMenuItem>
            <context_menu_1.ContextMenuItem>
              Name Window...
            </context_menu_1.ContextMenuItem>
            <context_menu_1.ContextMenuSeparator />
            <context_menu_1.ContextMenuItem>
              Developer Tools
            </context_menu_1.ContextMenuItem>
          </context_menu_1.ContextMenuSubContent>
        </context_menu_1.ContextMenuSub>
      </context_menu_1.ContextMenuContent>
    </context_menu_1.ContextMenu>
  ),
};
/**
 * A context menu with checkboxes.
 */
exports.WithCheckboxes = {
  render: (args) => (
    <context_menu_1.ContextMenu {...args}>
      <context_menu_1.ContextMenuTrigger className="flex h-48 w-96 items-center justify-center rounded-md border border-dashed bg-accent text-sm">
        Right click here
      </context_menu_1.ContextMenuTrigger>
      <context_menu_1.ContextMenuContent className="w-64">
        <context_menu_1.ContextMenuCheckboxItem checked>
          Show Comments
          <context_menu_1.ContextMenuShortcut>
            ⌘⇧C
          </context_menu_1.ContextMenuShortcut>
        </context_menu_1.ContextMenuCheckboxItem>
        <context_menu_1.ContextMenuCheckboxItem>
          Show Preview
        </context_menu_1.ContextMenuCheckboxItem>
      </context_menu_1.ContextMenuContent>
    </context_menu_1.ContextMenu>
  ),
};
/**
 * A context menu with a radio group.
 */
exports.WithRadioGroup = {
  render: (args) => (
    <context_menu_1.ContextMenu {...args}>
      <context_menu_1.ContextMenuTrigger className="flex h-48 w-96 items-center justify-center rounded-md border border-dashed bg-accent text-sm">
        Right click here
      </context_menu_1.ContextMenuTrigger>
      <context_menu_1.ContextMenuContent className="w-64">
        <context_menu_1.ContextMenuRadioGroup value="light">
          <context_menu_1.ContextMenuLabel inset>
            Theme
          </context_menu_1.ContextMenuLabel>
          <context_menu_1.ContextMenuRadioItem value="light">
            Light
          </context_menu_1.ContextMenuRadioItem>
          <context_menu_1.ContextMenuRadioItem value="dark">
            Dark
          </context_menu_1.ContextMenuRadioItem>
        </context_menu_1.ContextMenuRadioGroup>
      </context_menu_1.ContextMenuContent>
    </context_menu_1.ContextMenu>
  ),
};
