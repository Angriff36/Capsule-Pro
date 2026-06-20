"use client";

import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@repo/auth/client";
import { useDisplayPreferences, useHighContrast } from "@repo/design-system";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";

/** Half-filled circle = the conventional high-contrast glyph. */
const ContrastIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="16"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
  </svg>
);

/** Large + small "A" = the conventional text-size glyph. */
const TextSizeIcon = () => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    height="16"
    viewBox="0 0 24 24"
    width="16"
  >
    <text fontSize="11" fontWeight="700" x="0" y="19">
      A
    </text>
    <text fontSize="16" fontWeight="700" x="9" y="19">
      A
    </text>
  </svg>
);

/** Stacked rows = the conventional density glyph. */
const DensityIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="16"
  >
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const FONT_SIZE_LABEL = {
  default: "Default",
  large: "Large",
  "x-large": "Extra large",
} as const;

const DENSITY_LABEL = {
  default: "Default",
  compact: "Compact",
  spacious: "Spacious",
} as const;

/**
 * Analytics-aware UserButton wrapper.
 * Fires auth:logout when Clerk's auth state transitions from signed-in to signed-out.
 */
export function TrackedUserButton() {
  const posthog = usePostHog();
  const { isSignedIn } = useAuth();
  const { enabled: highContrast, toggle: toggleHighContrast } =
    useHighContrast();
  const { fontSize, density, cycleFontSize, cycleDensity } =
    useDisplayPreferences();
  const wasSignedIn = useRef(isSignedIn);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Detect transition: was signed in, now signed out
    if (wasSignedIn.current && !isSignedIn) {
      posthog?.capture("auth:logout", {});
    }
    wasSignedIn.current = isSignedIn;
  }, [isSignedIn, posthog]);

  if (!mounted) {
    return <div aria-hidden className="h-8 w-full shrink-0" />;
  }

  return (
    <UserButton
      appearance={{
        elements: {
          rootBox: "flex overflow-hidden w-full",
          userButtonBox: "flex-row-reverse",
          userButtonOuterIdentifier: "truncate pl-0",
        },
      }}
      showName
    >
      <UserButton.MenuItems>
        <UserButton.Action
          label={highContrast ? "High contrast: On" : "High contrast: Off"}
          labelIcon={<ContrastIcon />}
          onClick={toggleHighContrast}
        />
        <UserButton.Action
          label={`Text size: ${FONT_SIZE_LABEL[fontSize]}`}
          labelIcon={<TextSizeIcon />}
          onClick={cycleFontSize}
        />
        <UserButton.Action
          label={`Density: ${DENSITY_LABEL[density]}`}
          labelIcon={<DensityIcon />}
          onClick={cycleDensity}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
