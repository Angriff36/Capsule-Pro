import type { NextRequest } from "next/server";

import { executeManifestCommand } from "@/lib/manifest-command-handler";

export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "Shipment",
    commandName: "markDelivered",
    transformBody: (body) => ({
      ...body,
      receivedBy: body.receivedBy ?? body.received_by,
      signature: body.signature ?? body.delivery_signature,
    }),
  });
}
