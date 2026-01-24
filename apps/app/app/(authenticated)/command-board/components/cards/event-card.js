"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCard = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const statusConfig = {
  confirmed: {
    label: "Confirmed",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  tentative: {
    label: "Tentative",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  completed: {
    label: "Completed",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
};
exports.EventCard = (0, react_1.memo)(function EventCard({ card }) {
  const metadata = card.metadata;
  const status = metadata.status || "confirmed";
  const config = statusConfig[status] || statusConfig.confirmed;
  const eventDate = metadata.eventDate ? new Date(metadata.eventDate) : null;
  const guestCount = metadata.guestCount || 0;
  const budget = metadata.budget;
  const venueName = metadata.venueName;
  const eventType = metadata.eventType || "Event";
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <badge_1.Badge className={config.color} variant="outline">
          {config.label}
        </badge_1.Badge>
        <badge_1.Badge className="text-xs" variant="secondary">
          {eventType}
        </badge_1.Badge>
      </div>

      <h3 className="mb-3 line-clamp-2 font-semibold text-sm">{card.title}</h3>

      <div className="mb-3 space-y-1.5">
        {eventDate && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <lucide_react_1.Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{(0, date_fns_1.format)(eventDate, "MMM d, yyyy")}</span>
          </div>
        )}
        {guestCount > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <lucide_react_1.Users className="h-3.5 w-3.5 shrink-0" />
            <span>{guestCount} guests</span>
          </div>
        )}
        {budget && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <lucide_react_1.DollarSign className="h-3.5 w-3.5 shrink-0" />
            <span>{budget.toLocaleString()}</span>
          </div>
        )}
        {venueName && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <lucide_react_1.MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{venueName}</span>
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
              View Event
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              Edit Details
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              Open Battle Board
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              View Proposal
            </dropdown_menu_1.DropdownMenuItem>
          </dropdown_menu_1.DropdownMenuContent>
        </dropdown_menu_1.DropdownMenu>
      </div>
    </div>
  );
});
