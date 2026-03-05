"use client";

import { SignIn as ClerkSignIn } from "@clerk/nextjs";

const normalizePath = (value: string | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }

  return value.replace(/^['"]|['"]$/g, "");
};

const signInUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  "/sign-in"
);
const signUpUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  "/sign-up"
);
const signInFallbackRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
  "/"
);
const signInForceRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL,
  signInFallbackRedirectUrl
);
const signUpFallbackRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
  signInFallbackRedirectUrl
);
const signUpForceRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
  signUpFallbackRedirectUrl
);

export const SignIn = () => (
  <ClerkSignIn
    appearance={{
      elements: {
        header: "hidden",
      },
    }}
    fallbackRedirectUrl={signInFallbackRedirectUrl}
    forceRedirectUrl={signInForceRedirectUrl}
    path={signInUrl}
    routing="path"
    signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
    signUpForceRedirectUrl={signUpForceRedirectUrl}
    signUpUrl={signUpUrl}
  />
);
