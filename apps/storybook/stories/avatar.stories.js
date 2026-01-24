Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const avatar_1 = require("@repo/design-system/components/ui/avatar");
/**
 * An image element with a fallback for representing the user.
 */
const meta = {
  title: "ui/Avatar",
  component: avatar_1.Avatar,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <avatar_1.Avatar {...args}>
      <avatar_1.AvatarImage src="https://github.com/shadcn.png" />
      <avatar_1.AvatarFallback>CN</avatar_1.AvatarFallback>
    </avatar_1.Avatar>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the avatar.
 */
exports.Default = {};
