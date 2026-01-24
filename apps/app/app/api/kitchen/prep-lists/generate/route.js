Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const actions_1 = require("../../../../(authenticated)/kitchen/prep-lists/actions");
async function POST(request) {
  try {
    const body = await request.json();
    const { eventId, batchMultiplier, dietaryRestrictions } = body;
    if (!eventId) {
      return server_1.NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }
    const prepList = await (0, actions_1.generatePrepList)({
      eventId,
      batchMultiplier,
      dietaryRestrictions,
    });
    return server_1.NextResponse.json(prepList);
  } catch (error) {
    console.error("Error generating prep list:", error);
    return server_1.NextResponse.json(
      { error: "Failed to generate prep list" },
      { status: 500 }
    );
  }
}
