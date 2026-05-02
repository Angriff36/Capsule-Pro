import { type ApiData, verifyAccess } from "flags";
import * as flags from "./index";

// Uses Web standard Request/Response so this module does not import directly
// from `next/*`. NextRequest extends Request, so app routes can still pass
// their NextRequest in unchanged. NextResponse.json is interchangeable with
// Response.json from the framework's perspective.
export const getFlags = async (request: Request): Promise<Response> => {
  const access = await verifyAccess(request.headers.get("Authorization"));

  if (!access) {
    return Response.json(null, { status: 401 });
  }

  const definitions = Object.fromEntries(
    Object.values(flags).map((flag) => [
      flag.key,
      {
        origin: flag.origin,
        description: flag.description,
        options: flag.options,
      },
    ])
  );

  return Response.json({ definitions } satisfies ApiData);
};
