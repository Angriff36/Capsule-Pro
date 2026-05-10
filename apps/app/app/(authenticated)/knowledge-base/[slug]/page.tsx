import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import KnowledgeBaseDetailClient from "./knowledge-base-detail-client";

interface KnowledgeBaseDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function KnowledgeBaseDetailPage({
  params,
}: KnowledgeBaseDetailPageProps) {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const { slug } = await params;

  return <KnowledgeBaseDetailClient slug={slug} />;
}
