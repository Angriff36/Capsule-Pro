Object.defineProperty(exports, "__esModule", { value: true });
exports.Destructive = exports.Default = void 0;
const alert_1 = require("@repo/design-system/components/ui/alert");
const lucide_react_1 = require("lucide-react");
/**
 * Displays a callout for user attention.
 */
const meta = {
  title: "ui/Alert",
  component: alert_1.Alert,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      options: ["default", "destructive"],
      control: { type: "radio" },
    },
  },
  args: {
    variant: "default",
  },
  render: (args) => (
    <alert_1.Alert {...args}>
      <alert_1.AlertTitle>Heads up!</alert_1.AlertTitle>
      <alert_1.AlertDescription>
        You can add components to your app using the cli.
      </alert_1.AlertDescription>
    </alert_1.Alert>
  ),
};
exports.default = meta;
/**
 * The default form of the alert.
 */
exports.Default = {};
/**
 * Use the `destructive` alert to indicate a destructive action.
 */
exports.Destructive = {
  render: (args) => (
    <alert_1.Alert {...args}>
      <lucide_react_1.AlertCircle className="h-4 w-4" />
      <alert_1.AlertTitle>Error</alert_1.AlertTitle>
      <alert_1.AlertDescription>
        Your session has expired. Please log in again.
      </alert_1.AlertDescription>
    </alert_1.Alert>
  ),
  args: {
    variant: "destructive",
  },
};
