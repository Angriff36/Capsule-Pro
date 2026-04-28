import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { SignUpWithAnalytics } from "./sign-up-with-analytics";

const title = "Create an account";
const description = "Enter your details to get started.";

export const metadata: Metadata = createMetadata({ title, description });

const SignUpPage = () => <SignUpWithAnalytics />;

export default SignUpPage;
