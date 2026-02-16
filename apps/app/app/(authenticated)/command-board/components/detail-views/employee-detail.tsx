"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
import { ExternalLink, Mail, Shield, User } from "lucide-react";
import Link from "next/link";
import type { ResolvedEmployee } from "../../types/entities";

// ============================================================================
// Employee Detail View
// ============================================================================

interface EmployeeDetailProps {
  data: ResolvedEmployee;
}

export function EmployeeDetail({ data }: EmployeeDetailProps) {
  return (
    <div className="space-y-4">
      {/* Active/Inactive Badge */}
      <div className="flex items-center gap-2">
        <Badge variant={data.isActive ? "default" : "destructive"}>
          {data.isActive ? "Active" : "Inactive"}
        </Badge>
        {data.roleName && <Badge variant="outline">{data.roleName}</Badge>}
      </div>

      <Separator />

      {/* Name */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <User className="size-4 text-muted-foreground" />
          Personal Info
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Full Name</span>
            <span className="font-medium">
              {data.firstName} {data.lastName}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Role */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Shield className="size-4 text-muted-foreground" />
          Role
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">
              {data.roleName ?? data.role ?? "Not assigned"}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Mail className="size-4 text-muted-foreground" />
          Contact
        </h4>
        <div className="space-y-2 pl-6 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 text-muted-foreground" />
            <span>{data.email}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Open Full Page */}
      <Button asChild className="w-full" variant="outline">
        <Link href="/staff/team">
          <ExternalLink className="mr-2 size-4" />
          Open in Staff
        </Link>
      </Button>
    </div>
  );
}
