Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = void 0;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../lib/tenant");
const header_1 = require("../components/header");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});
const generateMetadata = async ({ searchParams }) => {
  const { q } = await searchParams;
  return {
    title: `${q} - Search results`,
    description: `Search results for ${q}`,
  };
};
exports.generateMetadata = generateMetadata;
const SearchPage = async ({ searchParams }) => {
  const { q } = await searchParams;
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  if (!q) {
    (0, navigation_1.redirect)("/");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const events = await database_1.database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        {
          title: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          eventNumber: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          venueName: {
            contains: q,
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    take: 12,
  });
  return (
    <>
      <header_1.Header page="Search" pages={["Building Your Application"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {events.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No matching events.
            </div>
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
exports.default = SearchPage;
