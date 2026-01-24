var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const header_1 = require("../../components/header");
const KitchenTeamPage = () => {
  return (
    <>
      <header_1.Header page="Kitchen Team" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.Users className="h-5 w-5" />
              Team Management
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Kitchen team management is handled in the Staff module. View team
              members, their roles, skills, and station assignments there.
            </p>
            <div className="flex flex-wrap gap-3">
              <button_1.Button asChild>
                <link_1.default href="/staff/team">
                  View Full Team
                </link_1.default>
              </button_1.Button>
              <button_1.Button asChild variant="outline">
                <link_1.default href="/staff/schedule">
                  View Schedule
                </link_1.default>
              </button_1.Button>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <div className="grid gap-4 md:grid-cols-3">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-base flex items-center gap-2">
                <lucide_react_1.UserPlus className="h-4 w-4" />
                Onboarding
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Add new team members</li>
                <li>Set up roles and permissions</li>
                <li>Assign station skills</li>
                <li>Configure availability</li>
              </ul>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-base flex items-center gap-2">
                <lucide_react_1.Settings className="h-4 w-4" />
                Role Management
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Define kitchen roles</li>
                <li>Set skill requirements</li>
                <li>Configure certifications</li>
                <li>Manage training records</li>
              </ul>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-base">
                Station Assignments
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Assign staff to stations</li>
                <li>Track station coverage</li>
                <li>Manage lead positions</li>
                <li>View team composition</li>
              </ul>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Common Tasks</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <button_1.Button
                asChild
                className="h-auto flex-col gap-2 py-4"
                variant="outline"
              >
                <link_1.default href="/staff/team?view=online">
                  <lucide_react_1.Users className="h-5 w-5" />
                  <span>Who's Working</span>
                </link_1.default>
              </button_1.Button>
              <button_1.Button
                asChild
                className="h-auto flex-col gap-2 py-4"
                variant="outline"
              >
                <link_1.default href="/staff/team?action=assign">
                  <lucide_react_1.UserPlus className="h-5 w-5" />
                  <span>Quick Assign</span>
                </link_1.default>
              </button_1.Button>
              <button_1.Button
                asChild
                className="h-auto flex-col gap-2 py-4"
                variant="outline"
              >
                <link_1.default href="/staff/availability">
                  <lucide_react_1.Settings className="h-5 w-5" />
                  <span>Availability</span>
                </link_1.default>
              </button_1.Button>
              <button_1.Button
                asChild
                className="h-auto flex-col gap-2 py-4"
                variant="outline"
              >
                <link_1.default href="/staff/time-off">
                  <span className="text-xl">📅</span>
                  <span>Time Off</span>
                </link_1.default>
              </button_1.Button>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </>
  );
};
exports.default = KitchenTeamPage;
