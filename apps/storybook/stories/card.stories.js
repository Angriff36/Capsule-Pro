Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
const notifications = [
  {
    title: "Your call has been confirmed.",
    description: "1 hour ago",
  },
  {
    title: "You have a new message!",
    description: "1 hour ago",
  },
  {
    title: "Your subscription is expiring soon!",
    description: "2 hours ago",
  },
];
/**
 * Displays a card with header, content, and footer.
 */
const meta = {
  title: "ui/Card",
  component: card_1.Card,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    className: "w-96",
  },
  render: (args) => (
    <card_1.Card {...args}>
      <card_1.CardHeader>
        <card_1.CardTitle>Notifications</card_1.CardTitle>
        <card_1.CardDescription>
          You have 3 unread messages.
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent className="grid gap-4">
        {notifications.map((notification, index) => (
          <div className="flex items-center gap-4" key={index}>
            <lucide_react_1.BellRing className="size-6" />
            <div>
              <p>{notification.title}</p>
              <p className="text-foreground/50">{notification.description}</p>
            </div>
          </div>
        ))}
      </card_1.CardContent>
      <card_1.CardFooter>
        <button className="hover:underline" type="button">
          Close
        </button>
      </card_1.CardFooter>
    </card_1.Card>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the card.
 */
exports.Default = {};
