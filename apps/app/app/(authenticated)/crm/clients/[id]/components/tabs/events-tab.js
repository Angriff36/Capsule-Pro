"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsTab = EventsTab;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../../../actions");
function EventsTab({ clientId }) {
  const [events, setEvents] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [pagination, setPagination] = (0, react_1.useState)({
    offset: 0,
    limit: 20,
    total: 0,
  });
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await (0, actions_1.getClientEventHistory)(
        clientId,
        pagination.limit,
        pagination.offset
      );
      setEvents(data.data);
      setPagination((prev) => ({ ...prev, total: data.pagination.total }));
    } catch (error) {
      sonner_1.toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };
  (0, react_1.useEffect)(() => {
    fetchEvents();
  }, [clientId, pagination.offset]);
  const loadMore = () => {
    setPagination((prev) => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  };
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">
        Event History ({pagination.total})
      </h2>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <card_1.Card>
          <card_1.CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <lucide_react_1.CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No events yet</h3>
            <p className="text-muted-foreground">
              This client hasn't been associated with any events yet.
            </p>
          </card_1.CardContent>
        </card_1.Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <card_1.Card key={event.id}>
              <card_1.CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <lucide_react_1.CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">
                      Order #{event.orderNumber}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <badge_1.Badge className="text-xs" variant="outline">
                        {event.order_status}
                      </badge_1.Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <lucide_react_1.DollarSignIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {Number(event.totalAmount.toString()).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <button_1.Button asChild size="sm" variant="ghost">
                    <a href={`/crm/clients/${clientId}`}>
                      <lucide_react_1.ChevronRightIcon className="h-4 w-4" />
                    </a>
                  </button_1.Button>
                </div>
              </card_1.CardContent>
            </card_1.Card>
          ))}

          {pagination.offset + pagination.limit < pagination.total && (
            <div className="text-center">
              <button_1.Button onClick={loadMore} variant="outline">
                Load More
                <lucide_react_1.ChevronRightIcon className="h-4 w-4 ml-2" />
              </button_1.Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
