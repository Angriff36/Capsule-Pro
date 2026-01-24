"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TimecardBulkActions;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
function TimecardBulkActions({ totalEntries }) {
  const [selectedCount, setSelectedCount] = (0, react_1.useState)(0);
  return (
    <card_1.Card className="bg-card/60">
      <card_1.CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <badge_1.Badge variant="secondary">
                {totalEntries} total
              </badge_1.Badge>
              {selectedCount > 0 && (
                <badge_1.Badge>{selectedCount} selected</badge_1.Badge>
              )}
            </div>
          </div>

          <dropdown_menu_1.DropdownMenu>
            <dropdown_menu_1.DropdownMenuTrigger asChild>
              <button_1.Button disabled={selectedCount === 0} variant="default">
                Bulk Actions
              </button_1.Button>
            </dropdown_menu_1.DropdownMenuTrigger>
            <dropdown_menu_1.DropdownMenuContent align="end">
              <dropdown_menu_1.DropdownMenuItem>
                <lucide_react_1.CheckIcon className="mr-2 h-4 w-4 text-green-600" />
                Approve Selected
              </dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuItem>
                <lucide_react_1.XIcon className="mr-2 h-4 w-4 text-red-600" />
                Reject Selected
              </dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuItem>
                <lucide_react_1.EditIcon className="mr-2 h-4 w-4 text-blue-600" />
                Request Edits
              </dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuItem>
                <lucide_react_1.FlagIcon className="mr-2 h-4 w-4 text-orange-600" />
                Flag Exceptions
              </dropdown_menu_1.DropdownMenuItem>
            </dropdown_menu_1.DropdownMenuContent>
          </dropdown_menu_1.DropdownMenu>
        </div>
      </card_1.CardContent>
    </card_1.Card>
  );
}
