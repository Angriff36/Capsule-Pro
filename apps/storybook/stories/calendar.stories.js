Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleMonths =
  exports.Disabled =
  exports.Range =
  exports.Multiple =
  exports.Default =
    void 0;
const calendar_1 = require("@repo/design-system/components/ui/calendar");
const date_fns_1 = require("date-fns");
const actions_1 = require("storybook/actions");
/**
 * A date field component that allows users to enter and edit date.
 */
const meta = {
  title: "ui/Calendar",
  component: calendar_1.Calendar,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    mode: "single",
    selected: new Date(),
    onSelect: (0, actions_1.action)("onDayClick"),
    className: "rounded-md border w-fit",
  },
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the calendar.
 */
exports.Default = {};
/**
 * Use the `multiple` mode to select multiple dates.
 */
exports.Multiple = {
  args: {
    min: 1,
    selected: [
      new Date(),
      (0, date_fns_1.addDays)(new Date(), 2),
      (0, date_fns_1.addDays)(new Date(), 8),
    ],
    mode: "multiple",
  },
};
/**
 * Use the `range` mode to select a range of dates.
 */
exports.Range = {
  args: {
    selected: {
      from: new Date(),
      to: (0, date_fns_1.addDays)(new Date(), 7),
    },
    mode: "range",
  },
};
/**
 * Use the `disabled` prop to disable specific dates.
 */
exports.Disabled = {
  args: {
    disabled: [
      (0, date_fns_1.addDays)(new Date(), 1),
      (0, date_fns_1.addDays)(new Date(), 2),
      (0, date_fns_1.addDays)(new Date(), 3),
      (0, date_fns_1.addDays)(new Date(), 5),
    ],
  },
};
/**
 * Use the `numberOfMonths` prop to display multiple months.
 */
exports.MultipleMonths = {
  args: {
    numberOfMonths: 2,
    showOutsideDays: false,
  },
};
