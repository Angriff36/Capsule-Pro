Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const label_1 = require("@repo/design-system/components/ui/label");
/**
 * Renders an accessible label associated with controls.
 */
const meta = {
  title: "ui/Label",
  component: label_1.Label,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: { type: "text" },
    },
  },
  args: {
    children: "Your email address",
    htmlFor: "email",
  },
};
exports.default = meta;
/**
 * The default form of the label.
 */
exports.Default = {};
