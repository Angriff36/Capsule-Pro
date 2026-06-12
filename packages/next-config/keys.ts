import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Build the canonical URL for a service on preview deployments.
 *
 * On Vercel preview deploys, VERCEL_URL is auto-set to the deploy URL
 * (e.g., "capsule-pro-app-git-feature-xyz-myteam.vercel.app").
 * We derive other service URLs by replacing the project name prefix.
 *
 * If VERCEL_PREVIEW_URL_SUFFIX is set (e.g., "preview.capsulepro.com"),
 * all services use that suffix instead of the auto-generated Vercel URL.
 */
function getPreviewUrl(servicePrefix: string): string | undefined {
  // Custom preview suffix takes priority (e.g., "preview.capsulepro.com")
  const customSuffix = process.env.VERCEL_PREVIEW_URL_SUFFIX;
  if (customSuffix) {
    const protocol = customSuffix.startsWith("http") ? "" : "https://";
    return `${protocol}${customSuffix}`;
  }

  // Auto-generated Vercel preview URL
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    // VERCEL_URL for a specific project already has the correct hostname
    // (e.g., "capsule-pro-api-git-feat-xyz.vercel.app" for the API project)
    // So we just return it directly — it's already the right URL for that project.
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return;
}

export const keys = () => {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  const isPreview = process.env.VERCEL_ENV === "preview";

  return createEnv({
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    server: {
      ANALYZE: z.string().optional(),

      // Added by Vercel
      NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

      // Vercel environment variables
      VERCEL: z.string().optional(),
      VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
      VERCEL_URL: z.string().optional(),
      VERCEL_REGION: z.string().optional(),
      VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

      // Custom preview URL suffix override
      VERCEL_PREVIEW_URL_SUFFIX: z.string().optional(),

      // API project URL for cross-project rewrites (set in Vercel project settings)
      VERCEL_API_URL: z.string().optional(),
    },
    client: {
      NEXT_PUBLIC_APP_URL: z.url(),
      NEXT_PUBLIC_WEB_URL: z.url(),
      NEXT_PUBLIC_API_URL: z.url().optional(),
      NEXT_PUBLIC_DOCS_URL: z.url().optional(),
    },
    runtimeEnv: {
      ANALYZE: process.env.ANALYZE,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_PREVIEW_URL_SUFFIX: process.env.VERCEL_PREVIEW_URL_SUFFIX,
      VERCEL_API_URL: process.env.VERCEL_API_URL,
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL ??
        (isPreview
          ? getPreviewUrl("capsule-pro-app")
          : isProduction
            ? process.env.VERCEL_PROJECT_PRODUCTION_URL
              ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
              : "http://127.0.0.1:2221"
            : "http://127.0.0.1:2221"),
      NEXT_PUBLIC_WEB_URL:
        process.env.NEXT_PUBLIC_WEB_URL ??
        (isPreview
          ? getPreviewUrl("capsule-pro-web")
          : isProduction
            ? process.env.VERCEL_PROJECT_PRODUCTION_URL
              ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
              : "http://127.0.0.1:2222"
            : "http://127.0.0.1:2222"),
      NEXT_PUBLIC_API_URL:
        process.env.NEXT_PUBLIC_API_URL ??
        (isPreview
          ? process.env.VERCEL_API_URL
            ? `https://${process.env.VERCEL_API_URL.replace(/^https?:\/\//, "")}`
            : getPreviewUrl("capsule-pro-api")
          : undefined),
      NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    },
  });
};
