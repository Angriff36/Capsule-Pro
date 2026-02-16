"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { Mail, UserCircle } from "lucide-react";
import { memo } from "react";
import type { ResolvedEmployee } from "../../types/entities";
import { ENTITY_TYPE_COLORS } from "../../types/entities";

interface EmployeeNodeCardProps {
  data: ResolvedEmployee;
  stale: boolean;
}

export const EmployeeNodeCard = memo(function EmployeeNodeCard({
  data,
  stale,
}: EmployeeNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS.employee;
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  return (
    <div className={cn("flex h-full flex-col", stale && "opacity-50")}>
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <UserCircle className={cn("size-3.5 shrink-0", colors.icon)} />
          <span className={cn("font-medium text-xs", colors.text)}>
            Employee
          </span>
        </div>
        <Badge
          className="text-xs"
          variant={data.isActive ? "default" : "secondary"}
        >
          {data.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Name */}
      <h3 className="mb-1.5 line-clamp-2 font-semibold text-sm leading-tight">
        {fullName}
      </h3>

      {/* Details */}
      <div className="space-y-1">
        {data.roleName && (
          <Badge className="text-xs" variant="outline">
            {data.roleName}
          </Badge>
        )}
        {data.email && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="size-3 shrink-0" />
            <span className="line-clamp-1 text-xs">{data.email}</span>
          </div>
        )}
      </div>
    </div>
  );
});
