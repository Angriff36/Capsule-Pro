var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const dynamic_1 = __importDefault(require("next/dynamic"));
const navigation_1 = require("next/navigation");
const env_1 = require("@/env");
const tenant_1 = require("../lib/tenant");
const avatar_stack_1 = require("./components/avatar-stack");
const cursors_1 = require("./components/cursors");
const header_1 = require("./components/header");
const title = "Acme Inc";
const description = "My application.";
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});
const CollaborationProvider = (0, dynamic_1.default)(() =>
  import("./components/collaboration-provider").then(
    (mod) => mod.CollaborationProvider
  )
);
exports.metadata = {
  title,
  description,
};
const App = async () => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const events = await database_1.database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    take: 6,
  });
  return (
    <>
      <header_1.Header
        page="Data Fetching"
        pages={["Building Your Application"]}
      >
        {env_1.env.LIVEBLOCKS_SECRET && (
          <CollaborationProvider orgId={orgId}>
            <avatar_stack_1.AvatarStack />
            <cursors_1.Cursors />
          </CollaborationProvider>
        )}
      </header_1.Header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {events.length === 0 ? (
            <div className="text-muted-foreground text-sm">No events yet.</div>
          ) : (
            events.map((event) => (
              <div
                className="flex flex-col justify-between gap-2 rounded-xl bg-muted/50 p-4"
                key={`${event.tenantId}-${event.id}`}
              >
                <div className="font-medium text-sm">{event.title}</div>
                <div className="text-muted-foreground text-xs">
                  {dateFormatter.format(event.eventDate)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
};
exports.default = App;
