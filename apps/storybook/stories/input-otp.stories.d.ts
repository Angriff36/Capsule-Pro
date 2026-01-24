import { InputOTP } from "@repo/design-system/components/ui/input-otp";
import type { StoryObj } from "@storybook/react";
/**
 * Accessible one-time password component with copy paste functionality.
 */
declare const meta: {
  title: string;
  component: typeof InputOTP;
  tags: string[];
  argTypes: {};
  args: {
    maxLength: number;
    pattern: string;
    children: null;
  };
  render: (
    args: (import("input-otp").OTPInputProps &
      import("react").RefAttributes<HTMLInputElement>) & {
      containerClassName?: string;
    }
  ) => import("react").JSX.Element;
  parameters: {
    layout: string;
  };
};
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * The default form of the InputOTP field.
 */
export declare const Default: Story;
/**
 * Use multiple groups to separate the input slots.
 */
export declare const SeparatedGroup: Story;
//# sourceMappingURL=input-otp.stories.d.ts.map
