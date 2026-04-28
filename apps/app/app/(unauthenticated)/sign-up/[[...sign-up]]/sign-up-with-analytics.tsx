"use client";

import { useAuth } from "@clerk/nextjs";
import { SignUp } from "@repo/auth/components/sign-up";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef } from "react";

/**
 * Analytics wrapper around Clerk's <SignUp>.
 * Fires sign_up_started on mount and sign_up_completed when Clerk confirms.
 */
export function SignUpWithAnalytics() {
  const posthog = usePostHog();
  const { isSignedIn } = useAuth();
  const hasFired = useRef(false);

  useEffect(() => {
    posthog?.capture("auth:sign_up_started", {
      method: "clerk",
    });
  }, [posthog]);

  useEffect(() => {
    if (isSignedIn && !hasFired.current) {
      hasFired.current = true;
      posthog?.capture("auth:sign_up_completed", {
        method: "clerk",
      });
    }
  }, [isSignedIn, posthog]);

  return <SignUp />;
}
