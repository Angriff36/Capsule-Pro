Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const sheet_1 = require("@repo/design-system/components/ui/sheet");
/**
 * Extends the Dialog component to display content that complements the main
 * content of the screen.
 */
const meta = {
  title: "ui/Sheet",
  component: sheet_1.Sheet,
  tags: ["autodocs"],
  argTypes: {
    side: {
      options: ["top", "bottom", "left", "right"],
      control: {
        type: "radio",
      },
    },
  },
  args: {
    side: "right",
  },
  render: (args) => (
    <sheet_1.Sheet>
      <sheet_1.SheetTrigger>Open</sheet_1.SheetTrigger>
      <sheet_1.SheetContent {...args}>
        <sheet_1.SheetHeader>
          <sheet_1.SheetTitle>Are you absolutely sure?</sheet_1.SheetTitle>
          <sheet_1.SheetDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </sheet_1.SheetDescription>
        </sheet_1.SheetHeader>
        <sheet_1.SheetFooter>
          <sheet_1.SheetClose>
            <button className="hover:underline" type="button">
              Cancel
            </button>
          </sheet_1.SheetClose>
          <button
            className="rounded bg-primary px-4 py-2 text-primary-foreground"
            type="button"
          >
            Submit
          </button>
        </sheet_1.SheetFooter>
      </sheet_1.SheetContent>
    </sheet_1.Sheet>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the sheet.
 */
exports.Default = {};
