import { SignIn } from "@repo/auth/components/sign-in";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";

const title = "Welcome back";
const description = "Enter your details to sign in.";

export const metadata: Metadata = createMetadata({ title, description });

const SignInPage = () => <SignIn />;

export default SignInPage;
