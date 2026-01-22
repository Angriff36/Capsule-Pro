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
import { CheckIcon, EditIcon, FlagIcon, XIcon } from "lucide-react";
import { useState } from "react";

type TimecardBulkActionsProps = {
  totalEntries: number;
};

export default function TimecardBulkActions({
  totalEntries,
}: TimecardBulkActionsProps) {
  const [selectedCount, setSelectedCount] = useState(0);

  return (
    <Card className="bg-card/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{totalEntries} total</Badge>
              {selectedCount > 0 && <Badge>{selectedCount} selected</Badge>}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={selectedCount === 0} variant="default">
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <CheckIcon className="mr-2 h-4 w-4 text-green-600" />
                Approve Selected
              </DropdownMenuItem>
              <DropdownMenuItem>
                <XIcon className="mr-2 h-4 w-4 text-red-600" />
                Reject Selected
              </DropdownMenuItem>
              <DropdownMenuItem>
                <EditIcon className="mr-2 h-4 w-4 text-blue-600" />
                Request Edits
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FlagIcon className="mr-2 h-4 w-4 text-orange-600" />
                Flag Exceptions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
