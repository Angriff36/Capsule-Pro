"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCard = void 0;
const avatar_1 = require("@repo/design-system/components/ui/avatar");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const priorityConfig = {
  1: { label: "Critical", color: "bg-rose-500 text-white" },
  2: { label: "Urgent", color: "bg-red-500 text-white" },
  3: { label: "High", color: "bg-orange-500 text-white" },
  4: { label: "Medium-High", color: "bg-amber-500 text-white" },
  5: { label: "Medium", color: "bg-yellow-500 text-white" },
  6: { label: "Medium-Low", color: "bg-lime-500 text-white" },
  7: { label: "Low", color: "bg-green-500 text-white" },
  8: { label: "Very Low", color: "bg-emerald-500 text-white" },
  9: { label: "Minimal", color: "bg-teal-500 text-white" },
  10: { label: "None", color: "bg-slate-400 text-white" },
};
const statusConfig = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  canceled: { label: "Canceled", color: "bg-slate-100 text-slate-500" },
};
function getDueStatus(dueDate) {
  if (!dueDate) {
    return null;
  }
  const now = new Date();
  const diffMins = (0, date_fns_1.differenceInMinutes)(dueDate, now);
  if ((0, date_fns_1.isPast)(dueDate) && diffMins < -30) {
    return { label: "Overdue", isOverdue: true };
  }
  if (diffMins < 0) {
    return { label: `${Math.abs(diffMins)}m late`, isOverdue: true };
  }
  if (diffMins < 60) {
    return { label: `Due in ${diffMins}m`, isOverdue: false };
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 4) {
    return { label: `Due in ${diffHours}h`, isOverdue: false };
  }
  return { label: (0, date_fns_1.format)(dueDate, "MMM d"), isOverdue: false };
}
exports.TaskCard = (0, react_1.memo)(function TaskCard({ card }) {
  const metadata = card.metadata;
  const priority = metadata.priority || 5;
  const status = metadata.status || "pending";
  const priorityConfigItem = priorityConfig[priority] || priorityConfig[5];
  const statusConfigItem = statusConfig[status] || statusConfig.pending;
  const dueDate = metadata.dueDate ? new Date(metadata.dueDate) : null;
  const dueStatus = getDueStatus(dueDate);
  const assignee = metadata.assignee;
  const getInitials = (name) => {
    if (!name) {
      return "?";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <badge_1.Badge
          className={`border-0 ${priorityConfigItem.color} font-medium text-xs`}
        >
          {priorityConfigItem.label}
        </badge_1.Badge>
        {dueStatus?.isOverdue && (
          <badge_1.Badge className="gap-1 text-xs" variant="destructive">
            <lucide_react_1.AlertCircle className="h-3 w-3" />
            {dueStatus.label}
          </badge_1.Badge>
        )}
      </div>

      <h3 className="mb-2 line-clamp-2 font-semibold text-sm">{card.title}</h3>

      {card.content && (
        <p className="mb-3 line-clamp-2 text-muted-foreground text-xs">
          {card.content}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <badge_1.Badge className={statusConfigItem.color} variant="outline">
          {statusConfigItem.label}
        </badge_1.Badge>
        {dueDate && !dueStatus?.isOverdue && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <lucide_react_1.Calendar className="h-3 w-3" />
            <span>{dueStatus?.label}</span>
          </div>
        )}
      </div>

      {assignee && (
        <div className="mb-3 flex items-center gap-2">
          <avatar_1.Avatar className="h-6 w-6">
            <avatar_1.AvatarFallback className="text-[10px]">
              {getInitials(assignee.name)}
            </avatar_1.AvatarFallback>
          </avatar_1.Avatar>
          <span className="text-muted-foreground text-xs">{assignee.name}</span>
        </div>
      )}

      <div className="mt-auto">
        <dropdown_menu_1.DropdownMenu>
          <dropdown_menu_1.DropdownMenuTrigger asChild>
            <button_1.Button
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
            >
              <lucide_react_1.MoreVertical className="h-4 w-4" />
              Quick Actions
            </button_1.Button>
          </dropdown_menu_1.DropdownMenuTrigger>
          <dropdown_menu_1.DropdownMenuContent align="end">
            <dropdown_menu_1.DropdownMenuItem>
              View Task
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              Edit Task
            </dropdown_menu_1.DropdownMenuItem>
            {status !== "completed" && (
              <dropdown_menu_1.DropdownMenuItem>
                Mark Complete
              </dropdown_menu_1.DropdownMenuItem>
            )}
            {status === "pending" && (
              <dropdown_menu_1.DropdownMenuItem>
                Start Task
              </dropdown_menu_1.DropdownMenuItem>
            )}
          </dropdown_menu_1.DropdownMenuContent>
        </dropdown_menu_1.DropdownMenu>
      </div>
    </div>
  );
});
