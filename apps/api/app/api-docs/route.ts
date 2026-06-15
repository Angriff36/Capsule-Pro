/**
 * Scalar API reference for the Capsule-Pro Manifest API.
 *
 * GET /api-docs
 *
 * Renders an interactive, browsable explorer over the generated OpenAPI spec
 * (served auth-gated at /api-docs/openapi.json). This is a diagnostic/developer
 * surface, so it requires an authenticated session — on failure we 401 rather
 * than expose the API shape publicly.
 *
 * CSP note: the global strict CSP (default-src 'none') is carved out for /api-docs
 * in next.config.ts so Scalar's CDN assets + inline config script can load. The
 * relaxation is scoped to this route only.
 */
import { ApiReference } from "@scalar/nextjs-api-reference";
import { requireCurrentUser } from "@/app/lib/tenant";

export const dynamic = "force-dynamic";

const renderReference = ApiReference({
  url: "/api-docs/openapi.json",
  // Cosmetic: a sensible default theme for the explorer.
  theme: "default",
});

export async function GET(): Promise<Response> {
  try {
    await requireCurrentUser();
  } catch {
    return new Response("Authentication required", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return renderReference();
}
