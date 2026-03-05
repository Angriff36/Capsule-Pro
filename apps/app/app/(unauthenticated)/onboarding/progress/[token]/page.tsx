/**
 * @module PublicOnboardingProgressPage
 * @intent Public page for managers/team leads to view a user's onboarding progress
 * @responsibility Display checklist progress without authentication
 * @domain Onboarding
 * @tags onboarding, public, progress, sharing
 * @canonical true
 */

import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Building2, Calendar, CheckCircle2, Circle, User } from "lucide-react";
import { notFound } from "next/navigation";

interface PublicOnboardingProgressPageProps {
  params: Promise<{
    token: string;
  }>;
}

interface ProgressItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ProgressData {
  items: ProgressItem[];
  userName: string;
  tenantName: string;
  completedCount: number;
  totalCount: number;
  generatedAt: string;
}

const PublicOnboardingProgressPage = async ({
  params,
}: PublicOnboardingProgressPageProps) => {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  // Find share by token
  const share = await database.onboardingProgressShare.findUnique({
    where: { shareToken: token },
  });

  if (!share) {
    notFound();
  }

  // Check if expired
  if (share.expiresAt && new Date() > share.expiresAt) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Link Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This onboarding progress link has expired. Please request a new
              link from the user.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressData = share.progressData as ProgressData;
  const items = progressData.items ?? [];
  const completedCount =
    progressData.completedCount ?? items.filter((i) => i.completed).length;
  const totalCount = progressData.totalCount ?? items.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Onboarding Progress</CardTitle>
            {allCompleted ? (
              <Badge className="bg-green-500 hover:bg-green-600">
                Complete
              </Badge>
            ) : (
              <Badge variant="secondary">In Progress</Badge>
            )}
          </div>

          {/* User and Organization Info */}
          <div className="space-y-2 text-sm text-muted-foreground">
            {progressData.userName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{progressData.userName}</span>
              </div>
            )}
            {progressData.tenantName && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{progressData.tenantName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Shared{" "}
                {new Date(
                  progressData.generatedAt ?? share.createdAt
                ).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {completedCount} of {totalCount} tasks completed
              </span>
              <span className="text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <Progress className="h-2" value={progressPercent} />
          </div>
        </CardHeader>

        <CardContent>
          {/* Checklist Items */}
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <div
                  className={`flex items-start gap-3 rounded-lg p-3 ${
                    item.completed
                      ? "bg-green-50 dark:bg-green-950/20"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      item.completed
                        ? "text-green-700 dark:text-green-400 line-through"
                        : ""
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {allCompleted && (
            <div className="mt-6 rounded-lg bg-green-50 dark:bg-green-950/20 p-4 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                All onboarding tasks have been completed!
              </p>
            </div>
          )}

          {!allCompleted && completedCount > 0 && (
            <div className="mt-6 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Stuck items:</strong>{" "}
                {items
                  .filter((i) => !i.completed)
                  .map((i) => i.label)
                  .join(", ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicOnboardingProgressPage;
