"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthHeader = void 0;
const nextjs_1 = require("@clerk/nextjs");
const AuthHeader = () => (
  <header>
    <nextjs_1.SignedOut>
      <nextjs_1.SignInButton />
      <nextjs_1.SignUpButton />
    </nextjs_1.SignedOut>
    <nextjs_1.SignedIn>
      <nextjs_1.UserButton />
    </nextjs_1.SignedIn>
  </header>
);
exports.AuthHeader = AuthHeader;
