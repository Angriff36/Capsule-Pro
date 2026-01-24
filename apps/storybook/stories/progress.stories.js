Object.defineProperty(exports, "__esModule", { value: true });
exports.Completed = exports.Indeterminate = exports.Default = void 0;
const progress_1 = require("@repo/design-system/components/ui/progress");
/**
 * Displays an indicator showing the completion progress of a task, typically
 * displayed as a progress bar.
 */
const meta = {
  title: "ui/Progress",
  component: progress_1.Progress,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    value: 30,
    max: 100,
  },
};
exports.default = meta;
/**
 * The default form of the progress.
 */
exports.Default = {};
/**
 * When the progress is indeterminate.
 */
exports.Indeterminate = {
  args: {
    value: undefined,
  },
};
/**
 * When the progress is completed.
 */
exports.Completed = {
  args: {
    value: 100,
  },
};
