"use client";

import { SignIn } from "@repo/auth/components/sign-in";
import { useAuth } from "@clerk/nextjs";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef } from "react";

/**
 * Analytics wrapper around Clerk's <SignIn>.
 * Fires login_started on mount and login_completed when Clerk confirms sign-in.
 */
export function SignInWithAnalytics() {
  const posthog = usePostHog();
  const { isSignedIn } = useAuth();
  const hasFired = useRef(false);

  useEffect(() => {
    posthog?.capture("auth:login_started", {
      method: "clerk",
    });
  }, [posthog]);

  useEffect(() => {
    if (isSignedIn && !hasFired.current) {
      hasFired.current = true;
      posthog?.capture("auth:login_completed", {
        method: "clerk",
      });
    }
  }, [isSignedIn, posthog]);

  return <SignIn />;
}
