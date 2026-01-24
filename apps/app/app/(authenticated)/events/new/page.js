Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const navigation_1 = require("next/navigation");
const header_1 = require("../../components/header");
const actions_1 = require("../actions");
const event_form_1 = require("../components/event-form");
const NewEventPage = async () => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  return (
    <>
      <header_1.Header page="New event" pages={["Operations", "Events"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <event_form_1.EventForm
          action={actions_1.createEvent}
          submitLabel="Create event"
        />
      </div>
    </>
  );
};
exports.default = NewEventPage;
