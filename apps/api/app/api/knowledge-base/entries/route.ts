import type { NextRequest } from "next/server";
import { GET as listGET } from "./list/route";
export async function GET(request: NextRequest) {
  return listGET(request);
}
