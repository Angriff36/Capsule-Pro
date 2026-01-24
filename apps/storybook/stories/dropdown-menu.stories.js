Object.defineProperty(exports, "__esModule", { value: true });
exports.WithCheckboxes =
  exports.WithRadioItems =
  exports.WithSubmenus =
  exports.WithShortcuts =
  exports.Default =
    void 0;
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const lucide_react_1 = require("lucide-react");
/**
 * Displays a menu to the user — such as a set of actions or functions —
 * triggered by a button.
 */
const meta = {
  title: "ui/DropdownMenu",
  component: dropdown_menu_1.DropdownMenu,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <dropdown_menu_1.DropdownMenu {...args}>
      <dropdown_menu_1.DropdownMenuTrigger>
        Open
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent className="w-44">
        <dropdown_menu_1.DropdownMenuLabel>
          My Account
        </dropdown_menu_1.DropdownMenuLabel>
        <dropdown_menu_1.DropdownMenuSeparator />
        <dropdown_menu_1.DropdownMenuItem>
          Profile
        </dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuItem>
          Billing
        </dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuItem>
          Team
        </dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuItem>
          Subscription
        </dropdown_menu_1.DropdownMenuItem>
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the dropdown menu.
 */
exports.Default = {};
/**
 * A dropdown menu with shortcuts.
 */
exports.WithShortcuts = {
  render: (args) => (
    <dropdown_menu_1.DropdownMenu {...args}>
      <dropdown_menu_1.DropdownMenuTrigger>
        Open
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent className="w-44">
        <dropdown_menu_1.DropdownMenuLabel>
          Controls
        </dropdown_menu_1.DropdownMenuLabel>
        <dropdown_menu_1.DropdownMenuItem>
          Back
          <dropdown_menu_1.DropdownMenuShortcut>
            ⌘[
          </dropdown_menu_1.DropdownMenuShortcut>
        </dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuItem disabled>
          Forward
          <dropdown_menu_1.DropdownMenuShortcut>
            ⌘]
          </dropdown_menu_1.DropdownMenuShortcut>
        </dropdown_menu_1.DropdownMenuItem>
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>
  ),
};
/**
 * A dropdown menu with submenus.
 */
exports.WithSubmenus = {
  render: (args) => (
    <dropdown_menu_1.DropdownMenu {...args}>
      <dropdown_menu_1.DropdownMenuTrigger>
        Open
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent className="w-44">
        <dropdown_menu_1.DropdownMenuItem>
          <lucide_react_1.Search className="mr-2 size-4" />
          <span>Search</span>
        </dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuSeparator />
        <dropdown_menu_1.DropdownMenuGroup>
          <dropdown_menu_1.DropdownMenuItem>
            <lucide_react_1.Plus className="mr-2 size-4" />
            <span>New Team</span>
            <dropdown_menu_1.DropdownMenuShortcut>
              ⌘+T
            </dropdown_menu_1.DropdownMenuShortcut>
          </dropdown_menu_1.DropdownMenuItem>
          <dropdown_menu_1.DropdownMenuSub>
            <dropdown_menu_1.DropdownMenuSubTrigger>
              <lucide_react_1.UserPlus className="mr-2 size-4" />
              <span>Invite users</span>
            </dropdown_menu_1.DropdownMenuSubTrigger>
            <dropdown_menu_1.DropdownMenuPortal>
              <dropdown_menu_1.DropdownMenuSubContent>
                <dropdown_menu_1.DropdownMenuItem>
                  <lucide_react_1.Mail className="mr-2 size-4" />
                  <span>Email</span>
                </dropdown_menu_1.DropdownMenuItem>
                <dropdown_menu_1.DropdownMenuSeparator />
                <dropdown_menu_1.DropdownMenuItem>
                  <lucide_react_1.PlusCircle className="mr-2 size-4" />
                  <span>More...</span>
                </dropdown_menu_1.DropdownMenuItem>
              </dropdown_menu_1.DropdownMenuSubContent>
            </dropdown_menu_1.DropdownMenuPortal>
          </dropdown_menu_1.DropdownMenuSub>
        </dropdown_menu_1.DropdownMenuGroup>
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>
  ),
};
/**
 * A dropdown menu with radio items.
 */
exports.WithRadioItems = {
  render: (args) => (
    <dropdown_menu_1.DropdownMenu {...args}>
      <dropdown_menu_1.DropdownMenuTrigger>
        Open
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent className="w-44">
        <dropdown_menu_1.DropdownMenuLabel inset>
          Status
        </dropdown_menu_1.DropdownMenuLabel>
        <dropdown_menu_1.DropdownMenuRadioGroup value="warning">
          <dropdown_menu_1.DropdownMenuRadioItem value="info">
            Info
          </dropdown_menu_1.DropdownMenuRadioItem>
          <dropdown_menu_1.DropdownMenuRadioItem value="warning">
            Warning
          </dropdown_menu_1.DropdownMenuRadioItem>
          <dropdown_menu_1.DropdownMenuRadioItem value="error">
            Error
          </dropdown_menu_1.DropdownMenuRadioItem>
        </dropdown_menu_1.DropdownMenuRadioGroup>
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>
  ),
};
/**
 * A dropdown menu with checkboxes.
 */
exports.WithCheckboxes = {
  render: (args) => (
    <dropdown_menu_1.DropdownMenu {...args}>
      <dropdown_menu_1.DropdownMenuTrigger>
        Open
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent className="w-44">
        <dropdown_menu_1.DropdownMenuCheckboxItem checked>
          Autosave
          <dropdown_menu_1.DropdownMenuShortcut>
            ⌘S
          </dropdown_menu_1.DropdownMenuShortcut>
        </dropdown_menu_1.DropdownMenuCheckboxItem>
        <dropdown_menu_1.DropdownMenuCheckboxItem>
          Show Comments
        </dropdown_menu_1.DropdownMenuCheckboxItem>
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>
  ),
};
