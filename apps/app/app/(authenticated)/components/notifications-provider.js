"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsProvider = void 0;
const provider_1 = require("@repo/notifications/components/provider");
const next_themes_1 = require("next-themes");
const NotificationsProvider = ({ children, userId }) => {
  const { resolvedTheme } = (0, next_themes_1.useTheme)();
  return (
    <provider_1.NotificationsProvider theme={resolvedTheme} userId={userId}>
      {children}
    </provider_1.NotificationsProvider>
  );
};
exports.NotificationsProvider = NotificationsProvider;
