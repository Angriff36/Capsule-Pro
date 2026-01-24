var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const header_1 = require("../../components/header");
const KitchenSchedulePage = () => {
  return (
    <>
      <header_1.Header page="Kitchen Schedule" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.Clock className="h-5 w-5" />
              Staff Scheduling
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Kitchen staff scheduling is managed in the Staff module. View and
              manage shifts, time-off requests, and team availability there.
            </p>
            <div className="flex flex-wrap gap-3">
              <button_1.Button asChild>
                <link_1.default href="/staff/schedule">
                  View Staff Schedule
                </link_1.default>
              </button_1.Button>
              <button_1.Button asChild variant="outline">
                <link_1.default href="/staff/team">Manage Team</link_1.default>
              </button_1.Button>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <div className="grid gap-4 md:grid-cols-2">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-base flex items-center gap-2">
                <lucide_react_1.Calendar className="h-4 w-4" />
                Shift Management
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Create and edit shifts</li>
                <li>Assign staff to stations</li>
                <li>Manage overtime and breaks</li>
                <li>View coverage reports</li>
              </ul>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-base flex items-center gap-2">
                <lucide_react_1.Users className="h-4 w-4" />
                Team Availability
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Track employee availability</li>
                <li>Manage time-off requests</li>
                <li>View skills and certifications</li>
                <li>Handle shift swaps</li>
              </ul>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Quick Stats</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold">-</div>
                <div className="text-sm text-muted-foreground">
                  Today's Shifts
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">-</div>
                <div className="text-sm text-muted-foreground">
                  Staff On Duty
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">-</div>
                <div className="text-sm text-muted-foreground">
                  Coverage Alerts
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">-</div>
                <div className="text-sm text-muted-foreground">
                  Pending Requests
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Navigate to Staff module for full scheduling functionality.
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </>
  );
};
exports.default = KitchenSchedulePage;
