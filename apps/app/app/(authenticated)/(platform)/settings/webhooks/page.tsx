import { requireAdminUser } from "@/app/lib/auth-guards";
import { WebhooksClient } from "./webhooks-client";

export default async function WebhooksPage() {
  await requireAdminUser();
  return <WebhooksClient />;
}
