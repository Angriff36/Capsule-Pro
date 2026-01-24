Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const service_1 = require("../service");
async function POST(request) {
  try {
    const body = await request.json();
    const result = await (0, service_1.detectConflicts)(body);
    return server_1.NextResponse.json(result);
  } catch (error) {
    console.error("Conflict detection failed:", error);
    return server_1.NextResponse.json(
      {
        error: "Failed to detect conflicts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
