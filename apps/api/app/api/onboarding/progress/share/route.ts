import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface ChecklistProgressItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ProgressData {
  items: ChecklistProgressItem[];
  userName: string;
  tenantName: string;
  completedCount: number;
  totalCount: number;
  generatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { items } = body as { items: ChecklistProgressItem[] };

    if (!(items && Array.isArray(items))) {
      return manifestErrorResponse("Invalid items data", 400);
    }

    // Get user and tenant info
    const [user, account] = await Promise.all([
      database.user.findFirst({
        where: { tenantId, authUserId: userId, deletedAt: null },
      }),
      database.account.findUnique({
        where: { id: tenantId },
      }),
    ]);

    if (!user) {
      return manifestErrorResponse("User not found", 404);
    }

    // Check if a share already exists for this user
    let existingShare = await database.onboardingProgressShare.findFirst({
      where: { tenantId, userId: user.id },
    });

    const progressData: ProgressData = {
      items,
      userName: `${user.firstName} ${user.lastName}`,
      tenantName: account?.name ?? "Unknown Organization",
      completedCount: items.filter((item) => item.completed).length,
      totalCount: items.length,
      generatedAt: new Date().toISOString(),
    };
    const progressDataJson = progressData as unknown as Prisma.InputJsonValue;

    if (existingShare) {
      // Update existing share
      existingShare = await database.onboardingProgressShare.update({
        where: { tenantId, id: existingShare.id },
        data: {
          progressData: progressDataJson,
          updatedAt: new Date(),
        },
      });
      return manifestSuccessResponse({
        shareToken: existingShare.shareToken,
        shareUrl: `/onboarding/progress/${existingShare.shareToken}`,
      });
    }

    // Create new share
    const shareToken = nanoid(12);
    const newShare = await database.onboardingProgressShare.create({
      data: {
        tenantId,
        userId: user.id,
        shareToken,
        progressData: progressDataJson,
      },
    });

    return manifestSuccessResponse({
      shareToken: newShare.shareToken,
      shareUrl: `/onboarding/progress/${newShare.shareToken}`,
    });
  } catch (error) {
    console.error("Error creating onboarding progress share:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    // Get user
    const user = await database.user.findFirst({
      where: { tenantId, authUserId: userId, deletedAt: null },
    });

    if (!user) {
      return manifestErrorResponse("User not found", 404);
    }

    // Get existing share
    const existingShare = await database.onboardingProgressShare.findFirst({
      where: { tenantId, userId: user.id },
    });

    if (!existingShare) {
      return manifestSuccessResponse({ share: null });
    }

    return manifestSuccessResponse({
      share: {
        shareToken: existingShare.shareToken,
        shareUrl: `/onboarding/progress/${existingShare.shareToken}`,
        createdAt: existingShare.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding progress share:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
