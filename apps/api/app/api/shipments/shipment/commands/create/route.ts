import type { NextRequest } from "next/server";

import { executeManifestCommand } from "@/lib/manifest-command-handler";

export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "Shipment",
    commandName: "create",
  });
}
