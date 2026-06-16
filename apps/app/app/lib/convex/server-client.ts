import "server-only";

import { auth } from "@repo/auth/server";
import { ConvexHttpClient } from "convex/browser";
import { convexEnv } from "./env";

export async function getConvexServerClient(): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(convexEnv.url);
  try {
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });
    if (token) {
      client.setAuth(token);
    }
  } catch {
    // Unauthenticated — mutations fail closed in generated code.
  }
  return client;
}
