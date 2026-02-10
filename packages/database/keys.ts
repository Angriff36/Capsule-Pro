import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Neon direct connections often drop with "Connection terminated unexpectedly"
 * in serverless/Next.js. Rewrite to the pooler URL and add timeouts so the same
 * DATABASE_URL works and Neon has time to wake from pause.
 */
function toNeonPoolerUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("neon.tech")) {
      return url;
    }
    // Use pooler host if not already pooled
    if (!u.hostname.includes("-pooler")) {
      const beforeRegion = u.hostname.split(".")[0];
      if (beforeRegion?.startsWith("ep-")) {
        u.hostname = u.hostname.replace(beforeRegion, `${beforeRegion}-pooler`);
      }
    }
    // Give Neon time to wake from pause (avoids "Connection terminated unexpectedly" on first request)
    u.searchParams.set("connect_timeout", "15");
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url;
  }
}

export const keys = () => {
  const env = createEnv({
    server: {
      DATABASE_URL: z.url(),
      SHADOW_DATABASE_URL: z.url().optional(),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      SHADOW_DATABASE_URL: process.env.SHADOW_DATABASE_URL,
    },
  });
  return {
    ...env,
    DATABASE_URL: toNeonPoolerUrl(env.DATABASE_URL),
  };
};