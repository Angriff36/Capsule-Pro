/**
 * Public Proposal Mark-Viewed API
 *
 * POST /api/public/proposals/[token]/mark-viewed - Record first view of a
 * proposal opened via its public link (no auth required).
 *
 * Token lookup is the auth gate. The governed write executes via Manifest
 * runtime (Proposal.markViewed) with a synthetic system-user context, matching
 * the public respond route. Pre-validation reads bypass runtime per
 * constitution §10.
 */

import { database } from "@repo/database";
import type { ManifestUserContext } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { runManifestCommand } from "@/lib/manifest/execute-command";

type Params = Promise<{ token: string }>;

/**
 * Build a synthetic system-user context for public (unauthenticated)
 * operations. Uses the tenant's admin user to satisfy Manifest's RBAC
 * requirements.
 */
async function buildSystemUserContext(
  tenantId: string
): Promise<ManifestUserContext> {
  const adminUser = await database.user.findFirst({
    where: { tenantId, role: { in: ["owner", "admin"] }, deletedAt: null },
    select: { id: true, role: true },
  });

  return {
    id: adminUser?.id ?? "system",
    tenantId,
    role: adminUser?.role ?? "admin",
  };
}

export async function POST(_request: Request, { params }: { params: Params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { message: "Invalid proposal link" },
        { status: 400 }
      );
    }

    // Find proposal by public token (read path, constitution §10)
    const proposal = await database.proposal.findFirst({
      where: { publicToken: token, deletedAt: null },
      select: { id: true, tenantId: true, status: true, viewedAt: true },
    });

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found or link has expired" },
        { status: 404 }
      );
    }

    // Only the first view of a sent proposal is recorded; anything else is a
    // no-op success so the public page never surfaces an error.
    if (proposal.viewedAt || proposal.status !== "sent") {
      return NextResponse.json({ success: true, noop: true });
    }

    const systemUser = await buildSystemUserContext(proposal.tenantId);

    const result = await runManifestCommand({
      entity: "Proposal",
      command: "markViewed",
      body: {
        id: proposal.id,
        tenantId: proposal.tenantId,
        viewedByInfo: "public-link",
      },
      user: systemUser,
    });

    if (!result.ok) {
      log.error(
        "Failed to mark proposal viewed via Manifest:",
        await result.text()
      );
      return NextResponse.json(
        { message: "Failed to mark proposal as viewed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureException(error);
    log.error("Error marking public proposal viewed:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
