"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import {
  CheckIcon,
  EditIcon,
  FlagIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";

interface TimecardBulkActionsProps {
  selectedCount: number;
  totalEntries: number;
  loading: boolean;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkEditRequest: () => void;
  onBulkFlagExceptions: () => void;
}

export default function TimecardBulkActions({
  selectedCount,
  totalEntries,
  loading,
  onBulkApprove,
  onBulkReject,
  onBulkEditRequest,
  onBulkFlagExceptions,
}: TimecardBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="bg-card/60 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{totalEntries} total</Badge>
              <Badge>{selectedCount} selected</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              disabled={loading}
              onClick={onBulkApprove}
              size="sm"
              variant="outline"
            >
              {loading ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckIcon className="mr-2 h-4 w-4 text-green-600" />
              )}
              Approve
            </Button>
            <Button
              disabled={loading}
              onClick={onBulkReject}
              size="sm"
              variant="outline"
            >
              <XIcon className="mr-2 h-4 w-4 text-red-600" />
              Reject
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={loading} size="sm" variant="default">
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onBulkEditRequest}>
                  <EditIcon className="mr-2 h-4 w-4 text-blue-600" />
                  Request Edits
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBulkFlagExceptions}>
                  <FlagIcon className="mr-2 h-4 w-4 text-orange-600" />
                  Flag Exceptions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
