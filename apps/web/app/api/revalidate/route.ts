import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

/**
 * On-demand ISR revalidation webhook endpoint.
 *
 * BaseHub (and other CMS systems) can call this endpoint when content changes
 * to immediately revalidate cached pages instead of waiting for time-based ISR.
 *
 * Configure BaseHub webhook to POST to:
 *   https://your-domain.com/api/revalidate
 * with header: Authorization: Bearer <REVALIDATION_SECRET>
 * and body: { "type": "path", "path": "/legal/privacy" }
 *        or { "type": "tag", "tag": "legal" }
 *
 * Required env vars:
 *   REVALIDATION_SECRET - secret token to authenticate webhooks
 *
 * Supported paths (web app):
 *   /, /contact, /pricing
 *   /legal/<slug>
 *   /blog, /blog/<slug>
 *
 * Note: Paths may include locale prefix (e.g., /en/contact, /fr/pricing) or not.
 * Locale prefix is stripped before validation, so both forms are accepted.
 *
 * Supported tags (requires next: { tags: [...] } in BaseHub queries):
 *   "blog", "legal", "home", "contact", "pricing"
 */

interface RevalidateBody {
  path?: string;
  tag?: string;
  type: "path" | "tag";
}

const ALLOWED_PATHS = ["/", "/contact", "/pricing", "/blog"];

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Authenticate via secret token
  const authHeader = request.headers.get("authorization");
  const secret = env.REVALIDATION_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "REVALIDATION_SECRET not configured" },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RevalidateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, path, tag } = body;

  if (type === "path" && path) {
    // Normalize path: strip query string, lowercase, remove trailing slash
    let normalizedPath = path.split("?")[0]?.toLowerCase() ?? "";
    if (normalizedPath.endsWith("/") && normalizedPath.length > 1) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    // Strip locale prefix (e.g., /en/contact -> /contact, /fr/blog/my-post -> /blog/my-post)
    // Locale is 2+ char segment that appears right after leading slash
    const pathWithoutLocale = normalizedPath.replace(
      /^\/[a-z]{2}(-[a-z]{2})?\//,
      "/"
    );

    // Allow exact match for known paths, or prefix match for dynamic routes
    const isAllowed =
      ALLOWED_PATHS.includes(pathWithoutLocale) ||
      pathWithoutLocale.startsWith("/legal/") ||
      pathWithoutLocale.startsWith("/blog/");

    if (!isAllowed) {
      return NextResponse.json(
        { error: `Path "${path}" is not allowed for revalidation` },
        { status: 400 }
      );
    }

    // Use the original path (with locale) for revalidation — Next.js expects the full URL path
    revalidatePath(path);
    return NextResponse.json({
      revalidated: true,
      type: "path",
      path,
      timestamp: Date.now(),
    });
  }

  if (type === "tag" && tag) {
    // Validate tag format (alphanumeric + hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
      return NextResponse.json(
        { error: `Invalid tag format: "${tag}"` },
        { status: 400 }
      );
    }

    revalidateTag(tag, "max");
    return NextResponse.json({
      revalidated: true,
      type: "tag",
      tag,
      timestamp: Date.now(),
    });
  }

  return NextResponse.json(
    {
      error:
        'Must provide { type: "path", path: string } or { type: "tag", tag: string }',
    },
    { status: 400 }
  );
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    endpoint: "revalidate",
    method: "POST",
    bodyFormat:
      '{ "type": "path", "path": "/pricing" } or { "type": "tag", "tag": "blog" }',
  });
}
