import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export async function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "AllergenWarning",
    commandName: "acknowledge",
  });
}
