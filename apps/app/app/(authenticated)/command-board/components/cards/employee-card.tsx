"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Mail, MoreVertical, Phone } from "lucide-react";
import { memo } from "react";
import type { CommandBoardCard } from "../../types";

interface EmployeeCardProps {
  card: CommandBoardCard;
}

const roleConfig = {
  admin: {
    label: "Admin",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  manager: {
    label: "Manager",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  staff: {
    label: "Staff",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
};

export const EmployeeCard = memo(function EmployeeCard({
  card,
}: EmployeeCardProps) {
  const metadata = card.metadata as {
    role?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
  };
  const role = metadata.role || "staff";
  const config =
    roleConfig[role as keyof typeof roleConfig] || roleConfig.staff;
  const firstName = metadata.firstName || "";
  const lastName = metadata.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || card.title;
  const email = metadata.email;
  const phone = metadata.phone;
  const avatarUrl = metadata.avatarUrl;

  const getInitials = (first?: string, last?: string) => {
    const f = first?.charAt(0)?.toUpperCase() || "";
    const l = last?.charAt(0)?.toUpperCase() || "";
    return f + l || "?";
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-600",
      "bg-emerald-100 text-emerald-600",
      "bg-violet-100 text-violet-600",
      "bg-amber-100 text-amber-600",
      "bg-rose-100 text-rose-600",
      "bg-cyan-100 text-cyan-600",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className={getAvatarColor(fullName)}>
            {getInitials(firstName, lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 font-semibold text-sm">{fullName}</h3>
          <Badge className={config.color} variant="outline">
            {config.label}
          </Badge>
        </div>
      </div>

      <div className="mb-3 space-y-1.5">
        {email && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{phone}</span>
          </div>
        )}
      </div>

      {card.content && (
        <p className="mb-3 line-clamp-2 text-muted-foreground text-xs">
          {card.content}
        </p>
      )}

      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
            >
              <MoreVertical className="h-4 w-4" />
              Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Profile</DropdownMenuItem>
            <DropdownMenuItem>Edit Employee</DropdownMenuItem>
            <DropdownMenuItem>View Schedule</DropdownMenuItem>
            <DropdownMenuItem>Send Message</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
