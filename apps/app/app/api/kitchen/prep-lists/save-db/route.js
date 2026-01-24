Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const actions_1 = require("../../../../(authenticated)/kitchen/prep-lists/actions");
/**
 * POST /api/kitchen/prep-lists/save-db
 * Save a generated prep list to the database
 */
async function POST(request) {
  try {
    const body = await request.json();
    const { eventId, prepList, name } = body;
    if (!(eventId && prepList)) {
      return server_1.NextResponse.json(
        { error: "eventId and prepList are required" },
        { status: 400 }
      );
    }
    const result = await (0, actions_1.savePrepListToDatabase)(
      eventId,
      prepList,
      name
    );
    if (!result.success) {
      return server_1.NextResponse.json(
        { error: result.error || "Failed to save prep list" },
        { status: 500 }
      );
    }
    return server_1.NextResponse.json({
      message: "Prep list saved successfully",
      prepListId: result.prepListId,
    });
  } catch (error) {
    console.error("Error saving prep list to database:", error);
    return server_1.NextResponse.json(
      { error: "Failed to save prep list to database" },
      { status: 500 }
    );
  }
}
