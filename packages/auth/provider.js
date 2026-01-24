"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = void 0;
const nextjs_1 = require("@clerk/nextjs");
const themes_1 = require("@clerk/themes");
const next_themes_1 = require("next-themes");
const AuthProvider = ({ privacyUrl, termsUrl, helpUrl, ...properties }) => {
  const { resolvedTheme } = (0, next_themes_1.useTheme)();
  const isDark = resolvedTheme === "dark";
  const baseTheme = isDark ? themes_1.dark : undefined;
  const variables = {
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
    fontWeight: {
      bold: "var(--font-weight-bold)",
      normal: "var(--font-weight-normal)",
      medium: "var(--font-weight-medium)",
    },
  };
  const elements = {
    dividerLine: "bg-border",
    socialButtonsIconButton: "bg-card",
    navbarButton: "text-foreground",
    organizationSwitcherTrigger__open: "bg-background",
    organizationPreviewMainIdentifier: "text-foreground",
    organizationSwitcherTriggerIcon: "text-muted-foreground",
    organizationPreview__organizationSwitcherTrigger: "gap-2",
    organizationPreviewAvatarContainer: "shrink-0",
  };
  const layout = {
    privacyPageUrl: privacyUrl,
    termsPageUrl: termsUrl,
    helpPageUrl: helpUrl,
  };
  return (
    <nextjs_1.ClerkProvider
      {...properties}
      appearance={{ layout, baseTheme, elements, variables }}
    />
  );
};
exports.AuthProvider = AuthProvider;
