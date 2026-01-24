Object.defineProperty(exports, "__esModule", { value: true });
exports.SeparatedGroup = exports.Default = void 0;
const input_otp_1 = require("@repo/design-system/components/ui/input-otp");
const input_otp_2 = require("input-otp");
/**
 * Accessible one-time password component with copy paste functionality.
 */
const meta = {
  title: "ui/InputOTP",
  component: input_otp_1.InputOTP,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    maxLength: 6,
    pattern: input_otp_2.REGEXP_ONLY_DIGITS_AND_CHARS,
    children: null,
  },
  render: (args) => (
    <input_otp_1.InputOTP {...args} render={undefined}>
      <input_otp_1.InputOTPGroup>
        <input_otp_1.InputOTPSlot index={0} />
        <input_otp_1.InputOTPSlot index={1} />
        <input_otp_1.InputOTPSlot index={2} />
        <input_otp_1.InputOTPSlot index={3} />
        <input_otp_1.InputOTPSlot index={4} />
        <input_otp_1.InputOTPSlot index={5} />
      </input_otp_1.InputOTPGroup>
    </input_otp_1.InputOTP>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the InputOTP field.
 */
exports.Default = {};
/**
 * Use multiple groups to separate the input slots.
 */
exports.SeparatedGroup = {
  render: (args) => (
    <input_otp_1.InputOTP {...args} render={undefined}>
      <input_otp_1.InputOTPGroup>
        <input_otp_1.InputOTPSlot index={0} />
        <input_otp_1.InputOTPSlot index={1} />
        <input_otp_1.InputOTPSlot index={2} />
      </input_otp_1.InputOTPGroup>
      <input_otp_1.InputOTPSeparator />
      <input_otp_1.InputOTPGroup>
        <input_otp_1.InputOTPSlot index={3} />
        <input_otp_1.InputOTPSlot index={4} />
        <input_otp_1.InputOTPSlot index={5} />
      </input_otp_1.InputOTPGroup>
    </input_otp_1.InputOTP>
  ),
};
