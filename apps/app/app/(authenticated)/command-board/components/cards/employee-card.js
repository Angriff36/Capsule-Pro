"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeCard = void 0;
const avatar_1 = require("@repo/design-system/components/ui/avatar");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
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
exports.EmployeeCard = (0, react_1.memo)(function EmployeeCard({ card }) {
  const metadata = card.metadata;
  const role = metadata.role || "staff";
  const config = roleConfig[role] || roleConfig.staff;
  const firstName = metadata.firstName || "";
  const lastName = metadata.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || card.title;
  const email = metadata.email;
  const phone = metadata.phone;
  const avatarUrl = metadata.avatarUrl;
  const getInitials = (first, last) => {
    const f = first?.charAt(0)?.toUpperCase() || "";
    const l = last?.charAt(0)?.toUpperCase() || "";
    return f + l || "?";
  };
  const getAvatarColor = (name) => {
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
        <avatar_1.Avatar className="h-10 w-10">
          <avatar_1.AvatarImage src={avatarUrl} />
          <avatar_1.AvatarFallback className={getAvatarColor(fullName)}>
            {getInitials(firstName, lastName)}
          </avatar_1.AvatarFallback>
        </avatar_1.Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 font-semibold text-sm">{fullName}</h3>
          <badge_1.Badge className={config.color} variant="outline">
            {config.label}
          </badge_1.Badge>
        </div>
      </div>

      <div className="mb-3 space-y-1.5">
        {email && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <lucide_react_1.Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <lucide_react_1.Phone className="h-3.5 w-3.5 shrink-0" />
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
              View Profile
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              Edit Employee
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              View Schedule
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              Send Message
            </dropdown_menu_1.DropdownMenuItem>
          </dropdown_menu_1.DropdownMenuContent>
        </dropdown_menu_1.DropdownMenu>
      </div>
    </div>
  );
});
