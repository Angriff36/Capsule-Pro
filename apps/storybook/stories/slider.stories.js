Object.defineProperty(exports, "__esModule", { value: true });
exports.Disabled = exports.Inverted = exports.Default = void 0;
const slider_1 = require("@repo/design-system/components/ui/slider");
/**
 * An input where the user selects a value from within a given range.
 */
const meta = {
  title: "ui/Slider",
  component: slider_1.Slider,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    defaultValue: [33],
    max: 100,
    step: 1,
  },
};
exports.default = meta;
/**
 * The default form of the slider.
 */
exports.Default = {};
/**
 * Use the `inverted` prop to have the slider fill from right to left.
 */
exports.Inverted = {
  args: {
    inverted: true,
  },
};
/**
 * Use the `disabled` prop to disable the slider.
 */
exports.Disabled = {
  args: {
    disabled: true,
  },
};
