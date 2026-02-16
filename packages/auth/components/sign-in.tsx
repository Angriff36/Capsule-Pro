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
const afterSignInUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
  "/"
);

export const SignIn = () => (
  <ClerkSignIn
    appearance={{
      elements: {
        header: "hidden",
      },
    }}
    path={signInUrl}
    redirectUrl={afterSignInUrl}
    routing="path"
    signUpUrl={signUpUrl}
  />
);
