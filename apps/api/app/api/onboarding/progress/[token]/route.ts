import type { NextRequest } from "next/server";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || typeof token !== "string") {
      return manifestErrorResponse("Invalid token", 400);
    }

    const share = await database.onboardingProgressShare.findUnique({
      where: { shareToken: token },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!share) {
      return manifestErrorResponse("Share not found", 404);
    }

    // Check if expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      return manifestErrorResponse("Share link has expired", 410);
    }

    const progressData = share.progressData as {
      items: Array<{ id: string; label: string; completed: boolean }>;
      userName: string;
      tenantName: string;
      completedCount: number;
      totalCount: number;
      generatedAt: string;
    };

    return manifestSuccessResponse({
      progress: {
        items: progressData.items,
        userName:
          progressData.userName ??
          `${share.user.firstName} ${share.user.lastName}`,
        tenantName: progressData.tenantName,
        completedCount:
          progressData.completedCount ??
          progressData.items.filter((i) => i.completed).length,
        totalCount: progressData.totalCount ?? progressData.items.length,
        generatedAt: progressData.generatedAt ?? share.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching shared onboarding progress:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
