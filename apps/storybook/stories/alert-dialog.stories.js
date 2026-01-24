Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const alert_dialog_1 = require("@repo/design-system/components/ui/alert-dialog");
/**
 * A modal dialog that interrupts the user with important content and expects
 * a response.
 */
const meta = {
  title: "ui/AlertDialog",
  component: alert_dialog_1.AlertDialog,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <alert_dialog_1.AlertDialog {...args}>
      <alert_dialog_1.AlertDialogTrigger>
        Open
      </alert_dialog_1.AlertDialogTrigger>
      <alert_dialog_1.AlertDialogContent>
        <alert_dialog_1.AlertDialogHeader>
          <alert_dialog_1.AlertDialogTitle>
            Are you sure absolutely sure?
          </alert_dialog_1.AlertDialogTitle>
          <alert_dialog_1.AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </alert_dialog_1.AlertDialogDescription>
        </alert_dialog_1.AlertDialogHeader>
        <alert_dialog_1.AlertDialogFooter>
          <alert_dialog_1.AlertDialogCancel>
            Cancel
          </alert_dialog_1.AlertDialogCancel>
          <alert_dialog_1.AlertDialogAction>
            Continue
          </alert_dialog_1.AlertDialogAction>
        </alert_dialog_1.AlertDialogFooter>
      </alert_dialog_1.AlertDialogContent>
    </alert_dialog_1.AlertDialog>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the alert dialog.
 */
exports.Default = {};
