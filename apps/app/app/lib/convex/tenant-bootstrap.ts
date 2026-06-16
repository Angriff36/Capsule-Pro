import "server-only";

import { currentUser } from "@repo/auth/server";
import { api } from "../../../../../convex/_generated/api";
import type { CurrentUser } from "@/app/lib/tenant";
import { getConvexServerClient } from "./server-client";

export async function ensureConvexCurrentUser(): Promise<CurrentUser> {
  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.at(0)?.emailAddress?.toLowerCase() ??
    "unknown@example.com";
  const firstName = clerkUser?.firstName ?? "Unknown";
  const lastName = clerkUser?.lastName ?? "User";

  const client = await getConvexServerClient();
  return (await client.mutation(api.identity.ensureCurrentUser, {
    email,
    firstName,
    lastName,
  })) as CurrentUser;
}
