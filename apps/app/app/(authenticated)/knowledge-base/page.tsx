import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import KnowledgeBaseClient from "./knowledge-base-client";

export default async function KnowledgeBasePage() {
  const { orgId } = await auth();
  
  if (!orgId) {
    redirect("/sign-in");
  }

  return <KnowledgeBaseClient />;
}
