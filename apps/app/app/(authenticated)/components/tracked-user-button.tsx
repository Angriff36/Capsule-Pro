"use client";

import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@repo/auth/client";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";

/**
 * Analytics-aware UserButton wrapper.
 * Fires auth:logout when Clerk's auth state transitions from signed-in to signed-out.
 */
export function TrackedUserButton() {
  const posthog = usePostHog();
  const { isSignedIn } = useAuth();
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
    />
  );
}
