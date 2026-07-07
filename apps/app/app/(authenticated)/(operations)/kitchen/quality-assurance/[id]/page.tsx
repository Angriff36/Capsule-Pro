import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../../lib/tenant";

const severityConfig: Record<
  string,
  {
    label: string;
    variant: "destructive" | "default" | "secondary" | "outline";
    color: string;
  }
> = {
  critical: {
    label: "Critical",
    variant: "destructive",
    color: "text-red-600",
  },
  high: { label: "High", variant: "destructive", color: "text-red-500" },
  medium: { label: "Medium", variant: "secondary", color: "text-yellow-600" },
  low: { label: "Low", variant: "outline", color: "text-blue-500" },
};

const statusConfig: Record<
  string,
  { label: string; icon: "alert" | "clock" | "check" | "shield"; color: string }
> = {
  open: { label: "Open", icon: "alert", color: "text-red-500" },
  in_progress: { label: "In Progress", icon: "clock", color: "text-blue-500" },
  resolved: { label: "Resolved", icon: "check", color: "text-green-500" },
  verified: { label: "Verified", icon: "shield", color: "text-emerald-600" },
};

function StatusIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "alert":
      return <AlertTriangle className={className} />;
    case "clock":
      return <Clock className={className} />;
    case "check":
      return <CheckCircle2 className={className} />;
    case "shield":
      return <Shield className={className} />;
    default:
      return <Clock className={className} />;
  }
}

export default async function CorrectiveActionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { orgId } = await auth();
  if (!orgId) {
    return notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  const action = await database.correctiveAction.findUnique({
    where: { tenantId_id: { tenantId, id } },
  });

  if (!action || action.deletedAt) {
    return notFound();
  }

  const severity = severityConfig[action.severity] ?? {
    label: "Medium",
    variant: "secondary" as const,
    color: "text-yellow-600",
  };
  const status = statusConfig[action.status] ?? {
    label: "Open",
    icon: "alert" as const,
    color: "text-red-500",
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Back link */}
      <Link
        className="inline-flex w-fit items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
        href="/kitchen/quality-assurance"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Quality Assurance
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StatusIcon
              className={`h-5 w-5 ${status.color}`}
              icon={status.icon}
            />
            <h1 className="font-bold text-2xl">{action.title}</h1>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>{action.actionNumber}</span>
            <span>|</span>
            <span>
              Created:{" "}
              {format(new Date(action.createdAt), "MMM d, yyyy h:mm a")}
            </span>
            {action.updatedAt && (
              <>
                <span>|</span>
                <span>
                  Updated:{" "}
                  {format(new Date(action.updatedAt), "MMM d, yyyy h:mm a")}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={severity.variant}>{severity.label}</Badge>
          <Badge variant="outline">{status.label}</Badge>
        </div>
      </div>

      <Separator />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
              <AlertTriangle className={`h-3.5 w-3.5 ${severity.color}`} />
              Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold text-2xl ${severity.color}`}>
              {severity.label}
            </div>
          </CardContent>
        </Card>

        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
              <Shield className="h-3.5 w-3.5 text-blue-500" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold text-2xl ${status.color}`}>
              {status.label}
            </div>
          </CardContent>
        </Card>

        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Due Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {action.dueDate
                ? format(new Date(action.dueDate), "MMM d, yyyy")
                : "-"}
            </div>
            {action.dueDate &&
              new Date(action.dueDate) < new Date() &&
              action.status !== "resolved" &&
              action.status !== "verified" && (
                <p className="text-red-500 text-xs">Overdue</p>
              )}
          </CardContent>
        </Card>

        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Assigned To
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {action.assignedTo ? action.assignedTo.slice(0, 8) : "Unassigned"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            {action.description ? (
              <p className="whitespace-pre-wrap text-sm">
                {action.description}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No description provided.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Root Cause */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Root Cause</CardTitle>
          </CardHeader>
          <CardContent>
            {action.rootCause ? (
              <p className="whitespace-pre-wrap text-sm">{action.rootCause}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No root cause documented.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Immediate Action */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Immediate Action</CardTitle>
          </CardHeader>
          <CardContent>
            {action.immediateAction ? (
              <p className="whitespace-pre-wrap text-sm">
                {action.immediateAction}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No immediate action documented.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preventive Action */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preventive Action</CardTitle>
          </CardHeader>
          <CardContent>
            {action.preventiveAction ? (
              <p className="whitespace-pre-wrap text-sm">
                {action.preventiveAction}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No preventive action documented.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resolution section */}
      {(action.resolvedAt ||
        action.resolutionNotes ||
        action.verificationMethod) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {action.resolvedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolved At</span>
                <span className="font-medium">
                  {format(new Date(action.resolvedAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>
            )}
            {action.resolvedBy && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolved By</span>
                <span className="font-medium">
                  {action.resolvedBy.slice(0, 8)}
                </span>
              </div>
            )}
            {action.resolutionNotes && (
              <div>
                <span className="text-muted-foreground">Resolution Notes</span>
                <p className="mt-1 whitespace-pre-wrap">
                  {action.resolutionNotes}
                </p>
              </div>
            )}
            {action.verificationMethod && (
              <div>
                <span className="text-muted-foreground">
                  Verification Method
                </span>
                <p className="mt-1 whitespace-pre-wrap">
                  {action.verificationMethod}
                </p>
              </div>
            )}
            {action.verifiedBy && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verified By</span>
                <span className="font-medium">
                  {action.verifiedBy.slice(0, 8)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
