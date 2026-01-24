"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientCard = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const clientTypeConfig = {
  company: {
    label: "Company",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  individual: {
    label: "Individual",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
};
exports.ClientCard = (0, react_1.memo)(function ClientCard({ card }) {
  const metadata = card.metadata;
  const clientType = metadata.clientType || "company";
  const config = clientTypeConfig[clientType] || clientTypeConfig.company;
  const companyName =
    metadata.companyName || (metadata.first_name && metadata.last_name)
      ? `${metadata.first_name} ${metadata.last_name}`
      : "Unknown Client";
  const email = metadata.email;
  const phone = metadata.phone;
  const location = [metadata.city, metadata.stateProvince]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <lucide_react_1.Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="line-clamp-1 font-semibold text-sm">{companyName}</h3>
        </div>
        <badge_1.Badge className={config.color} variant="outline">
          {config.label}
        </badge_1.Badge>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {email && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <lucide_react_1.Mail className="h-3 w-3" />
            <span className="line-clamp-1 max-w-[180px]">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <lucide_react_1.Phone className="h-3 w-3" />
            <span>{phone}</span>
          </div>
        )}
        {location && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <lucide_react_1.MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}
      </div>

      {card.content && (
        <p className="mb-3 line-clamp-3 text-muted-foreground text-xs">
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
              View Details
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              Edit Client
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              Create Event
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              View History
            </dropdown_menu_1.DropdownMenuItem>
          </dropdown_menu_1.DropdownMenuContent>
        </dropdown_menu_1.DropdownMenu>
      </div>
    </div>
  );
});
