import type { NextRequest } from "next/server";
import { forwardFacilitiesRequest } from "../../../proxy";

export const POST = (request: NextRequest) =>
  forwardFacilitiesRequest(request, "assets/commands/create");
