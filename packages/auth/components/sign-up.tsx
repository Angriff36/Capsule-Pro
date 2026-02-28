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
const afterSignUpUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ??
    process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  "/"
);

export const SignUp = () => (
  <ClerkSignUp
    appearance={{
      elements: {
        header: "hidden",
      },
    }}
    fallbackRedirectUrl={afterSignUpUrl}
    path={signUpUrl}
    routing="path"
    signInUrl={signInUrl}
  />
);
