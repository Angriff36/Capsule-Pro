Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const sonner_1 = require("@repo/design-system/components/ui/sonner");
const sonner_2 = require("sonner");
const actions_1 = require("storybook/actions");
/**
 * An opinionated toast component for React.
 */
const meta = {
  title: "ui/Sonner",
  component: sonner_1.Toaster,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    position: "bottom-right",
  },
  parameters: {
    layout: "fullscreen",
  },
};
exports.default = meta;
/**
 * The default form of the toaster.
 */
exports.Default = {
  render: (args) => (
    <div className="flex min-h-96 items-center justify-center space-x-2">
      <button
        onClick={() =>
          (0, sonner_2.toast)("Event has been created", {
            description: new Date().toLocaleString(),
            action: {
              label: "Undo",
              onClick: (0, actions_1.action)("Undo clicked"),
            },
          })
        }
        type="button"
      >
        Show Toast
      </button>
      <sonner_1.Toaster {...args} />
    </div>
  ),
};
