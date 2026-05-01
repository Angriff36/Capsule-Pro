import type { NextRequest } from "next/server";
import { forwardFacilitiesRequest } from "../../proxy";

export const GET = (request: NextRequest) =>
  forwardFacilitiesRequest(request, "areas/list");
