Object.defineProperty(exports, "__esModule", { value: true });
exports.Instant = exports.Default = void 0;
const hover_card_1 = require("@repo/design-system/components/ui/hover-card");
/**
 * For sighted users to preview content available behind a link.
 */
const meta = {
  title: "ui/HoverCard",
  component: hover_card_1.HoverCard,
  tags: ["autodocs"],
  argTypes: {},
  args: {},
  render: (args) => (
    <hover_card_1.HoverCard {...args}>
      <hover_card_1.HoverCardTrigger>Hover</hover_card_1.HoverCardTrigger>
      <hover_card_1.HoverCardContent>
        The React Framework - created and maintained by @vercel.
      </hover_card_1.HoverCardContent>
    </hover_card_1.HoverCard>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the hover card.
 */
exports.Default = {};
/**
 * Use the `openDelay` and `closeDelay` props to control the delay before the
 * hover card opens and closes.
 */
exports.Instant = {
  args: {
    openDelay: 0,
    closeDelay: 0,
  },
};
