"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsProvider = void 0;
const react_1 = require("@knocklabs/react");
const keys_1 = require("../keys");
const knockApiKey = (0, keys_1.keys)().NEXT_PUBLIC_KNOCK_API_KEY;
const knockFeedChannelId = (0, keys_1.keys)().NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID;
const NotificationsProvider = ({ children, theme, userId }) => {
  if (!(knockApiKey && knockFeedChannelId)) {
    return children;
  }
  return (
    <react_1.KnockProvider apiKey={knockApiKey} userId={userId}>
      <react_1.KnockFeedProvider colorMode={theme} feedId={knockFeedChannelId}>
        {children}
      </react_1.KnockFeedProvider>
    </react_1.KnockProvider>
  );
};
exports.NotificationsProvider = NotificationsProvider;
