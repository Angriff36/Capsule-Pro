Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const actions_1 = require("../../../../(authenticated)/kitchen/prep-lists/actions");
async function POST(request) {
  try {
    const body = await request.json();
    const { eventId, prepList } = body;
    if (!(eventId && prepList)) {
      return server_1.NextResponse.json(
        { error: "Event ID and prep list are required" },
        { status: 400 }
      );
    }
    const result = await (0, actions_1.savePrepListToProductionBoard)(
      eventId,
      prepList
    );
    if (!result.success) {
      return server_1.NextResponse.json(
        { error: result.error || "Failed to save prep list" },
        { status: 500 }
      );
    }
    return server_1.NextResponse.json(result);
  } catch (error) {
    console.error("Error saving prep list:", error);
    return server_1.NextResponse.json(
      { error: "Failed to save prep list" },
      { status: 500 }
    );
  }
}
