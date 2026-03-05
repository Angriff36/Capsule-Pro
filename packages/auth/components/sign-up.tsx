"use client";

import { SignUp as ClerkSignUp } from "@clerk/nextjs";

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
const signUpFallbackRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
  "/"
);
const signUpForceRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
  signUpFallbackRedirectUrl
);
const signInFallbackRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
  signUpFallbackRedirectUrl
);
const signInForceRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL,
  signInFallbackRedirectUrl
);

export const SignUp = () => (
  <ClerkSignUp
    appearance={{
      elements: {
        header: "hidden",
      },
    }}
    fallbackRedirectUrl={signUpFallbackRedirectUrl}
    forceRedirectUrl={signUpForceRedirectUrl}
    path={signUpUrl}
    routing="path"
    signInFallbackRedirectUrl={signInFallbackRedirectUrl}
    signInForceRedirectUrl={signInForceRedirectUrl}
    signInUrl={signInUrl}
  />
);
