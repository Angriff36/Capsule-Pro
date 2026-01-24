var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const header_1 = require("../../components/header");
const actions_1 = require("../actions");
const ImportEventPage = async () => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  return (
    <>
      <header_1.Header page="Import event" pages={["Operations", "Events"]}>
        <button_1.Button asChild variant="ghost">
          <link_1.default href="/events">Back to events</link_1.default>
        </button_1.Button>
      </header_1.Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Upload a CSV or PDF</card_1.CardTitle>
            <card_1.CardDescription>
              CSVs with prep list or dish columns are supported. PDFs will
              create a placeholder event for manual review.
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <form
              action={actions_1.importEvent}
              className="flex flex-col gap-4"
            >
              <input_1.Input
                accept=".csv,.pdf,image/*"
                name="file"
                required
                type="file"
              />
              <button_1.Button type="submit">Import event</button_1.Button>
            </form>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </>
  );
};
exports.default = ImportEventPage;
