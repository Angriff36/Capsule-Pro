import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { SignInWithAnalytics } from "./sign-in-with-analytics";

const title = "Welcome back";
const description = "Enter your details to sign in.";

export const metadata: Metadata = createMetadata({ title, description });

const SignInPage = () => <SignInWithAnalytics />;

export default SignInPage;
