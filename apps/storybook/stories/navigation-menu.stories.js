Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const navigation_menu_1 = require("@repo/design-system/components/ui/navigation-menu");
/**
 * A collection of links for navigating websites.
 */
const meta = {
  title: "ui/NavigationMenu",
  component: navigation_menu_1.NavigationMenu,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <navigation_menu_1.NavigationMenu {...args}>
      <navigation_menu_1.NavigationMenuList>
        <navigation_menu_1.NavigationMenuItem>
          <navigation_menu_1.NavigationMenuLink
            className={(0, navigation_menu_1.navigationMenuTriggerStyle)()}
          >
            Overview
          </navigation_menu_1.NavigationMenuLink>
        </navigation_menu_1.NavigationMenuItem>
        <navigation_menu_1.NavigationMenuList>
          <navigation_menu_1.NavigationMenuItem>
            <navigation_menu_1.NavigationMenuTrigger
              className={(0, navigation_menu_1.navigationMenuTriggerStyle)()}
            >
              Documentation
            </navigation_menu_1.NavigationMenuTrigger>
            <navigation_menu_1.NavigationMenuContent>
              <ul className="grid w-96 p-2">
                <li>
                  <navigation_menu_1.NavigationMenuLink
                    className={(0,
                    navigation_menu_1.navigationMenuTriggerStyle)()}
                  >
                    API Reference
                  </navigation_menu_1.NavigationMenuLink>
                </li>
                <li>
                  <navigation_menu_1.NavigationMenuLink
                    className={(0,
                    navigation_menu_1.navigationMenuTriggerStyle)()}
                  >
                    Getting Started
                  </navigation_menu_1.NavigationMenuLink>
                </li>
                <li>
                  <navigation_menu_1.NavigationMenuLink
                    className={(0,
                    navigation_menu_1.navigationMenuTriggerStyle)()}
                  >
                    Guides
                  </navigation_menu_1.NavigationMenuLink>
                </li>
              </ul>
            </navigation_menu_1.NavigationMenuContent>
          </navigation_menu_1.NavigationMenuItem>
        </navigation_menu_1.NavigationMenuList>
        <navigation_menu_1.NavigationMenuItem>
          <navigation_menu_1.NavigationMenuLink
            className={(0, navigation_menu_1.navigationMenuTriggerStyle)()}
            href="https:www.google.com"
            target="_blank"
          >
            External
          </navigation_menu_1.NavigationMenuLink>
        </navigation_menu_1.NavigationMenuItem>
      </navigation_menu_1.NavigationMenuList>
    </navigation_menu_1.NavigationMenu>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the navigation menu.
 */
exports.Default = {};
