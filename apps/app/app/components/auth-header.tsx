"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export const AuthHeader = () => (
  <header>
    <SignedOut>
      <SignInButton />
      <SignUpButton />
    </SignedOut>
    <SignedIn>
      <UserButton />
    </SignedIn>
  </header>
);
