import type { NextRequest } from "next/server";
import { GET as listGET } from "./list/route";

/**
 * GET /api/payroll/bank-accounts
 * Delegates to list handler — client fetches without /list suffix.
 */
export async function GET(request: NextRequest) {
  return listGET(request);
}
