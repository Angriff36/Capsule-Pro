Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const dialog_1 = require("@repo/design-system/components/ui/dialog");
/**
 * A window overlaid on either the primary window or another dialog window,
 * rendering the content underneath inert.
 */
const meta = {
  title: "ui/Dialog",
  component: dialog_1.Dialog,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <dialog_1.Dialog {...args}>
      <dialog_1.DialogTrigger>Open</dialog_1.DialogTrigger>
      <dialog_1.DialogContent>
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Are you absolutely sure?</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>
        <dialog_1.DialogFooter className="gap-4">
          <button className="hover:underline" type="button">
            Cancel
          </button>
          <dialog_1.DialogClose>
            <button
              className="rounded bg-primary px-4 py-2 text-primary-foreground"
              type="button"
            >
              Continue
            </button>
          </dialog_1.DialogClose>
        </dialog_1.DialogFooter>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the dialog.
 */
exports.Default = {};
