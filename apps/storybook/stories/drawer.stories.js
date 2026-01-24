Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const drawer_1 = require("@repo/design-system/components/ui/drawer");
/**
 * A drawer component for React.
 */
const meta = {
  title: "ui/Drawer",
  component: drawer_1.Drawer,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <drawer_1.Drawer {...args}>
      <drawer_1.DrawerTrigger>Open</drawer_1.DrawerTrigger>
      <drawer_1.DrawerContent>
        <drawer_1.DrawerHeader>
          <drawer_1.DrawerTitle>
            Are you sure absolutely sure?
          </drawer_1.DrawerTitle>
          <drawer_1.DrawerDescription>
            This action cannot be undone.
          </drawer_1.DrawerDescription>
        </drawer_1.DrawerHeader>
        <drawer_1.DrawerFooter>
          <button
            className="rounded bg-primary px-4 py-2 text-primary-foreground"
            type="button"
          >
            Submit
          </button>
          <drawer_1.DrawerClose>
            <button className="hover:underline" type="button">
              Cancel
            </button>
          </drawer_1.DrawerClose>
        </drawer_1.DrawerFooter>
      </drawer_1.DrawerContent>
    </drawer_1.Drawer>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the drawer.
 */
exports.Default = {};
